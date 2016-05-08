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

phonon.navigator().on({page: 'home', content: 'home.html', preventClose: false, readyDelay: 0}, function(activity) {

    /*activity.onReady(function () {
      var media = new Media('http://jungv.hd.free.fr:7771/musics/i-wanna-be-loved-by-you-marilyn-monroe.mp3', function () {
          console.log('done')
      });
      media.play();
    });*/
});

phonon.navigator().on({page: 'newlist', content: 'new-list.html', preventClose: false, readyDelay: 0}, function(activity) {

    activity.onReady(function () {
      document.querySelector('#submit').on('click', function () {
        var name = document.querySelector('#name').value;
        var adress = document.querySelector('#adress').value;
        if (!/^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(adress)) {
          return phonon.i18n().get(['newlist_error', 'information', 'ok'], function (values) {
              phonon.alert(values.newlist_error, values.information, false, values.ok);
          });
        }
        if (!name) {
          return phonon.i18n().get(['newlist_no_name', 'information', 'ok'], function (values) {
              phonon.alert(values.newlist_no_name, values.information, false, values.ok);
          });
        }
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
