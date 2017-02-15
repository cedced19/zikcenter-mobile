phonon.options({
    navigator: {
        defaultPage: 'home',
        animatePages: true,
        templateRootDirectory: 'views/',
        enableBrowserBackButton: true
    },
    i18n: {
        directory: 'langs/',
        localeFallback: 'en'
    }
});

var language = localStorage.getItem('language') || (window.navigator.userLanguage || window.navigator.language).split('-')[0];
phonon.updateLocale(language);

// Alert Errors
var alertError = function (text) {
  phonon.i18n().get([text, 'error', 'ok'], function (values) {
      phonon.alert(values[text], values.error, false, values.ok);
  });
};

// Check connection
var isOnline = function () {
    var networkState = navigator.connection.type;
    if (networkState === Connection.NONE) {
        return false;
    }
    return true;
};

// Get musics which have been downloaded before
var getLocalMusicsList = function (array) {
  var localList = [];
  array.forEach(function (music) {
    if (music.hasOwnProperty('path')) {
      localList.push(music)
    }
  });
  return localList;
};

// Media
var media, current, list, force;
var random = function () {
  var currentList;
  if (isOnline()) {
    currentList = list.musics;
  } else {
    currentList = getLocalMusicsList(list.musics);
  }
  var number = Math.floor(Math.random() * currentList.length);
  if (current != currentList[number]) {
    return currentList[number];
  } else {
    return random();
  }
};
var stop = function () {
  if (media) {
    force = true;
    media.stop();
    current = false;
    media = false;
  }
};
var start = function (music) {
  current = music;
  var adress;
  if (music.hasOwnProperty('path')) {
    adress = current.path;
  } else if (!isOnline()) {
    start(random());
    alertError('offline_cannot_play');
  } else {
    adress = list.adress + current.uri;
  }
  media = new Media(adress, function () {
    if (force) {
      force = false;
    } else {
      media.stop();
      media = false;
      start(random());
    }
  });
  media.play();
  phonon.i18n().get('notif_tricker', function(value) {
    MusicControls.create({
      track: current.name,
      artist: list.name,
      cover: 'icon.png',
      dismissable: false,
      hasPrev: false,
      hasNext: false,
      hasClose: false,
      ticker: value + ': "' + current.name + '"'
    });
    MusicControls.subscribe(function (action) {
      if (action == 'music-controls-pause') {
        media.pause();
        MusicControls.updateIsPlaying(false);
      }
      if (action == 'music-controls-play') {
        media.play();
        MusicControls.updateIsPlaying(true);
      }

    });
    MusicControls.listen();
  });
  document.querySelector('#current-music-name').innerHTML = current.name;
};

// Destroy player's notification
document.addEventListener('beforeunload', function () {
  MusicControls.destroy();
}, false);

// Back Button
document.addEventListener('backbutton', function () {
  console.log(window.location.href)
    if (window.location.href === 'file:///android_asset/www/index.html#!home') {
      MusicControls.destroy();
      stop();
      navigator.app.exitApp();
    } else {
        window.history.back();
    }
}, false);

// Display
phonon.navigator().on({page: 'home', content: 'home.html', preventClose: false, readyDelay: 0}, function(activity) {

    activity.onReady(function () {
      var ul = document.querySelector('#lists');
      var lists = JSON.parse(localStorage.getItem('lists'));

      var latest = document.querySelector('#latest-list');
      latest.innerHTML = localStorage.getItem('selected-list');
      latest.on('click', function () {
        if (latest.innerHTML != '') {
          localStorage.setItem('selected-list', latest.innerHTML);
          phonon.navigator().changePage('play');
        }
      });

      while (ul.firstChild) {
          ul.removeChild(ul.firstChild);
      }

      if (Array.isArray(lists)) {
        document.querySelector('#no-list').style.display = 'none';
        phonon.i18n().get('home_lists', function (value) {
          var title = document.createElement('li');
          title.appendChild(document.createTextNode(value));
          title.className += 'divider';
          ul.appendChild(title);
          lists.forEach(function (list) {
            var li = document.createElement('li');
            li.appendChild(document.createTextNode(list.name));
            li.on('click', function () {
              if (list.name != localStorage.getItem('selected-list')) {
                stop();
                localStorage.setItem('selected-list', list.name);
              }
              phonon.navigator().changePage('play');
            });
            li.className += 'padded-list';
            ul.appendChild(li);
          });
        });
      } else {
        document.getElementById('no-list').style.display = 'block';
      }
    });
});


phonon.navigator().on({page: 'play', content: 'play-list.html', preventClose: false, readyDelay: 1}, function(activity) {

    // Format music name to filename
    var format = function (name) {
      return name.toLowerCase()
	               .replace(/ /g, '-')
                 .replace(/_/g, '-')
                 .replace(/ã©/g, 'é')
                 .replace(/ã§/g, 'ç');
    };

    // File system
    var createFile = function (name, onSuccess, onError) {
      var random = Math.random().toString(36).substring(7);
      window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function(fileSystem) {
          fileSystem.getDirectory('Zikcenter', {create: true, exclusive: false}, function(dirEntry) {
              dirEntry.getFile(random + '-' + format(name) + '.mp3', { create: true, exclusive: false }, function (fileEntry) {
                  onSuccess(fileEntry)
              }, onError);
          }, onError);
      }, onError);
    };

    activity.onReady(function () {

      // Get the list
      var lists = JSON.parse(localStorage.getItem('lists'));
      var name = localStorage.getItem('selected-list');
      var listKey;

      for (var i in lists) {
        if (lists[i].name == name) {
          list = lists[i];
          listKey = i;
          break;
        }
      };


      // Display musics list
      var ul = document.querySelector('#musics');
      while (ul.firstChild) {
          ul.removeChild(ul.firstChild);
      }
      phonon.i18n().get('play_musics', function (value) {
        var title = document.createElement('li');
        title.appendChild(document.createTextNode(value));
        title.className += 'divider';
        ul.appendChild(title);
        document.querySelector('#list-name').innerHTML = name;

        list.musics.forEach(function (music, key) {
          var li = document.createElement('li');

          // Create download button
          var downloadbtn = document.createElement('a');

          if (music.hasOwnProperty('path')) {
            downloadbtn.style.color = '#88c3a6';
          }

          downloadbtn.on('click', function () {
            if (!isOnline()) {
              return alertError('cannot_download_offline');
            }
            createFile(music.name, function (file) {
              var fileTransfer = new FileTransfer();

              phonon.i18n().get(['downloading_music', 'please_wait'], function (values) {
                  cordova.plugin.pDialog.init({
                      progressStyle : 'HORIZONTAL',
                      cancelable : false,
                      title : values.please_wait,
                      message : values.downloading_music
                  });
              });

              fileTransfer.onprogress = function(progressEvent) {
                    cordova.plugin.pDialog.setProgress(Math.floor(progressEvent.loaded / progressEvent.total * 100));
              };

              fileTransfer.download(encodeURI(list.adress + music.uri), file.toURL(),
              function(entry) {
                    cordova.plugin.pDialog.dismiss();
                    downloadbtn.style.color = '#88c3a6';
                    if (music.hasOwnProperty('path')) {
                      window.resolveLocalFileSystemURL(music.path, function(fileEntry){
                        fileEntry.remove(function(){},function(){
                            alertError('deleting_file_error');
                        });
                      }, console.log);
                    }
                    lists[listKey].musics[key].path = entry.toURL();
                    localStorage.setItem('lists', JSON.stringify(lists));
              },
              function() {
                    downloadbtn.style.color = '#bd0d13';
                    cordova.plugin.pDialog.dismiss();
                    alertError('download_error');
              }, false, {});

            }, function () {
              downloadbtn.style.color = '#bd0d13';
              cordova.plugin.pDialog.dismiss();
              alertError('write_error');
            });
          });
          downloadbtn.className += 'pull-right icon icon-download';
          li.appendChild(downloadbtn);

          // Create play button
          var playBtn = document.createElement('a');
          playBtn.on('click', function () {
            stop();
            start(music);
          });
          playBtn.className += 'padded-list';
          playBtn.appendChild(document.createTextNode(music.name));
          li.appendChild(playBtn);

          ul.appendChild(li);
        });
      });

      if (!media) {
        start(random());
      }


    });

    activity.onClose(stop);
});

phonon.navigator().on({page: 'newlist', content: 'new-list.html', preventClose: false, readyDelay: 0}, function(activity) {

    activity.onCreate(function () {
      var checkAdress = function (adress) {
          var lists = JSON.parse(localStorage.getItem('lists'));
          for (var i in lists) {
            if (adress == lists[i].adress) {
              return true;
            }
          }
          return false;
      };

      document.querySelector('#submit').on('click', function () {
        // Define list
        var list = {
          name: document.querySelector('#new-name').value,
          adress: document.querySelector('#new-adress').value
        };

        // Add list to lists
        var add = function (res) {
          list.musics = res;
          var lists =  JSON.parse(localStorage.getItem('lists'));
          if (!Array.isArray(lists)) lists = [];
          lists.push(list);
          localStorage.setItem('lists', JSON.stringify(lists));
          phonon.i18n().get(['newlist_sucess', 'information', 'ok'], function (values) {
              phonon.alert(values.newlist_sucess, values.information, false, values.ok);
          });
          document.querySelector('#new-name').value = '';
          document.querySelector('#new-adress').value = '';
          phonon.navigator().changePage('home');
        };

        // Check if adress is an url
        if (!/^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(list.adress)) {
          return alertError('newlist_error');
        }

        // Check if there is a list
        if (!list.name || list.name == '') {
          return alertError('no_name');
        }

        // Replace '/' by nothing if there is
        if (list.adress.slice(-1) == '/') {
          list.adress = list.adress.substr(0, list.adress.length-1);
        }

        // Check if there is a list in lists which has the same adress
        if (checkAdress(list.adress)) {
          return alertError('newlist_same_adress');
        }

        // Get list of musics
        phonon.ajax({
            method: 'GET',
            url: list.adress + '/api/',
            crossDomain: true,
            dataType: 'json',
            success: add,
            error: function(res) {
              // Get list of musics of a Zikcenter Static
              phonon.ajax({
                  method: 'GET',
                  url: list.adress + '/data.json',
                  crossDomain: true,
                  dataType: 'json',
                  success: function(res) {
                    res.forEach(function (item) {
                      item.uri = item.uri.replace('./', '/');
                    });
                    add(res);
                  },
                  error: function() {
                    alertError('connection_error');
                  }
              });
            }
        });
      });
    });
});

phonon.navigator().on({page: 'updatelist', content: 'update-list.html', preventClose: false, readyDelay: 0}, function(activity) {

    activity.onCreate(function () {

      // Define value of field
      var name = document.querySelector('#update-name');

      // Push updated list to lists and send information
      var update = function () {
        var lists = JSON.parse(localStorage.getItem('lists')); // Get lists
        for (var i in lists) {
          if (lists[i].adress == list.adress) {
            lists[i] = list;
            localStorage.setItem('lists', JSON.stringify(lists));
            phonon.i18n().get(['updatelist_success', 'information', 'ok'], function (values) {
                phonon.alert(values.updatelist_success, values.information, false, values.ok);
            });
            phonon.navigator().changePage('home');
          }
        }
      };

      document.querySelector('#update').on('click', function () {
        // Check if there is a name
        if (!name.value || name.value == '') {
          return alertError('no_name');
        }
        list.name = name.value;
        localStorage.setItem('selected-list', name.value);
        update();
      });

      document.querySelector('#delete').on('click', function () {
        phonon.i18n().get(['question_sure', 'cancel', 'warning', 'ok'], function (values) {
          var confirm = phonon.confirm(values.question_sure, values.warning, true, values.ok, values.cancel);
          confirm.on('confirm', function () {
            getLocalMusicsList(list.musics).forEach(function (music) {
              window.resolveLocalFileSystemURL(music.path, function(fileEntry){
                fileEntry.remove(function(){},function(){
                    alertError('deleting_file_error');
                });
              }, console.log);
            });
            var lists = JSON.parse(localStorage.getItem('lists')); // Get lists
            for (var i in lists) {
              if (lists[i].adress == list.adress) {
                lists.splice(i, 1);
                localStorage.setItem('selected-list', '');
                stop();
                localStorage.setItem('lists', JSON.stringify(lists));
                phonon.navigator().changePage('home');
              }
            }
          });
        });
      });

      document.querySelector('#refresh').on('click', function () {
        var addPaths = function (newList) {
          var oldList = getLocalMusicsList(list.musics);
          newList.forEach(function(music, key) {
            for (var i in oldList) {
              if (music.name == oldList[i].name) {
                newList[key].path = oldList[i].path;
                break;
              }
            }
          });
          return newList;
        };

        phonon.ajax({
            method: 'GET',
            url: list.adress + '/api/',
            crossDomain: true,
            dataType: 'json',
            success: function (res) {
              list.musics = addPaths(res);
              update();
            },
            error: function(res) {
              phonon.ajax({
                  method: 'GET',
                  url: list.adress + '/data.json',
                  crossDomain: true,
                  dataType: 'json',
                  success: function(res) {
                    res.forEach(function (item) {
                      item.uri = item.uri.replace('./', '/');
                    });

                    list.musics = addPaths(res);
                    update();
                  },
                  error: function() {
                    alertError('connection_error');
                  }
              });
            }
        });
      });

    });

    activity.onReady(function () {
      document.querySelector('#update-name').value = list.name;
      document.querySelector('#update-title').innerHTML = list.name;
    });
});

phonon.navigator().on({ page: 'language', content: 'language.html', preventClose: false, readyDelay: 0 }, function (activity) {

    activity.onCreate(function () {
        var radios = document.querySelectorAll('input[name=language]');
        document.querySelector('#language-btn').on('click', function () {
            for (var i in radios) {
                if (radios[i].checked) {
                    localStorage.setItem('language', radios[i].value);
                    phonon.updateLocale(radios[i].value);
                    language = radios[i].value;
                    break;
                }
            }
            phonon.i18n().get(['language_confirm', 'information', 'ok'], function (values) {
                phonon.alert(values.language_confirm, values.information, false, values.ok);
            });
        });
    });

    activity.onReady(function () {
        var radios = document.querySelectorAll('input[name=language]');
        for (var i in radios) {
            if (radios[i].value == language) {
                radios[i].checked = true;
                break;
            }
        }
    });
});

phonon.i18n().bind();
phonon.navigator().start();
