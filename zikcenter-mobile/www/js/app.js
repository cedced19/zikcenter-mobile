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


var media, current, list, force;
var random = function () {
  var number = Math.floor(Math.random() * list.musics.length);
  if (current != list.musics[number]) {
    return list.musics[number];
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
  media = new Media(list.adress + current.uri, function () {
    if (force) {
      force = false;
    } else {
      media.stop();
      media = false;
      start(random());
    }
  });
  media.play();
  document.querySelector('#current-music-name').innerHTML = current.name;
};

phonon.navigator().on({page: 'home', content: 'home.html', preventClose: false, readyDelay: 0}, function(activity) {

    activity.onReady(function () {
      var ul = document.querySelector('#lists');
      var lists = JSON.parse(localStorage.getItem('lists'));

      var latest = document.querySelector('#latest-list');
      latest.innerHTML = localStorage.getItem('selected-list');
      latest.on('click', function () {
        localStorage.setItem('selected-list', latest.innerHTML);
        phonon.navigator().changePage('play');
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

    activity.onReady(function () {

      // Get the list
      var lists = JSON.parse(localStorage.getItem('lists'));
      var name = localStorage.getItem('selected-list');


      for (var i in lists) {
        if (lists[i].name == name) {
          list = lists[i];
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
        list.musics.forEach(function (music) {
          var li = document.createElement('li');
          li.appendChild(document.createTextNode(music.name));
          li.on('click', function () {
            stop();
            start(music);
          });
          li.className += 'padded-list';
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
      document.querySelector('#submit').on('click', function () {
        var list = {
          name: document.querySelector('#name').value,
          adress: document.querySelector('#adress').value
        };
        var add = function (res) {
          list.musics = res;
          if (list.adress.slice(-1) == '/') {
            list.adress = list.adress.substr(0, list.adress.length-1);
          }
          var lists =  JSON.parse(localStorage.getItem('lists'));
          if (!Array.isArray(lists)) lists = [];
          lists.push(list);
          localStorage.setItem('lists', JSON.stringify(lists));
          phonon.i18n().get(['newlist_sucess', 'information', 'ok'], function (values) {
              phonon.alert(values.newlist_sucess, values.information, false, values.ok);
          });
          phonon.navigator().changePage('home');
        };
        if (!/^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(list.adress)) {
          return phonon.i18n().get(['newlist_error', 'error', 'ok'], function (values) {
              phonon.alert(values.newlist_error, values.error, false, values.ok);
          });
        }
        if (!list.name) {
          return phonon.i18n().get(['newlist_no_name', 'error', 'ok'], function (values) {
              phonon.alert(values.newlist_no_name, values.error, false, values.ok);
          });
        }
        phonon.ajax({
            method: 'GET',
            url: list.adress + '/api/',
            crossDomain: true,
            dataType: 'json',
            success: add,
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
                    add(res);
                  },
                  error: function() {
                    phonon.i18n().get(['newlist_connection_error', 'error', 'ok'], function (values) {
                        phonon.alert(values.newlist_connection_error, values.error, false, values.ok);
                    });
                  }
              });
            }
        });
      });
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
