var HostUtils = (function () {
  // 預設的逾時時間(單位: ms)
  var timeout = 5000;

  // 預設Port
  var defaultPorts = ['9900', '5569', '6899', '7730', '8866'];

  // 快取的網站回應時間
  var cachedTimes;

  /**
   * 清除已經測試過的網站時間
   */
  function _clearCache() {
    cachedTimes = undefined;
  }

  /**
   * 取得可用網域
   *
   * Reverse Proxy Setting:
   *   location /api/hostnames {
   *     proxy_pass https://ai-cli.airegioncare.com/api/mem_domain;
   *     proxy_http_version 1.1;
   *   }
   *
   * @param {string} url API
   * @param {object} clientInfo ip 資訊
   * @param {string} loginCode 登入碼
   * @return {string[]} 可用網域
   */
   function getHost(url, clientInfo, loginCode) {
    var dfd = $.Deferred();

    $
      .ajax({
        url,
        data: { logincode: loginCode },
        method: 'GET',
        timeout,
        headers:{
          'RealUserAddr' : clientInfo.get_ip? clientInfo.get_ip : '',
          'RealUserID': clientInfo.key_id? clientInfo.key_id : '',
        },
        async: true,
      })
      .success(function (data) {
        dfd.resolve(data);
      })
      .error(function () {
        dfd.resolve();
      })

    return dfd.promise();
  }

  /**
   * 對網域隨機加入www前綴與協定
   *
   * @param {string[]} hosts 網域
   * @param {object} options 設定值
   * @return {string[]}
   */
  function encodeHosts(hosts, options = {}) {
    var noSuffix = !!options.no_www;
    var ports = !!options.ports ? options.ports : defaultPorts;

    var now = Date.now();

    // 調整讓網域快取一天
    var suffix = noSuffix ? '' : ('www' + Math.floor(now / 86400000).toString() + '.');
    var prefix = 'https://';

    return hosts.map((host) => {
      if (host.startsWith('http://') || host.startsWith('https://')) {
        return host;
      }

      var port = ':' + ports[Math.floor(Math.random() * ports.length)];
      return prefix + suffix + host + port;
    });
  }

  /**
   * 取得有效的回應時間(ms)
   *
   * @param {string} host
   */
  function getValidResponseTime(host) {
    var dfd = $.Deferred();
    var startAt = Date.now();
    var judgeMsBtnQuantity = document.getElementsByClassName('ms');
    var judgeThcomBtnQuantity = document.getElementsByClassName('thcom');

    if (judgeMsBtnQuantity.length > 1 || judgeThcomBtnQuantity.length > 1) {
      return dfd.resolve({host});
    }

      $.ajax({
        url: host + '/speed.php',
        method: 'GET',
        timeout,
      })
        .success(function (data, status, xhr) {
          var time = Date.now() - startAt;

          var serverHeaders = xhr.getResponseHeader('server');
          var isVerifiedServer = serverHeaders.toString().includes('CK6u06Vu4');

          if (isVerifiedServer) {
            dfd.resolve({ host, time });

            return;
          }

          dfd.resolve({ host, time: 99999 });
        })
        .error(function () {
          dfd.resolve({ host, time: 99999 });
        });

      return dfd.promise();

  }

  /**
   * 測試取得各網站的回應時間(ms)
   *
   * @param {string[]} hosts
   * @return {object[]} { host: 網站, time: 時間(ms) }
   */
  function testResponseTime(hosts, callback) {
    if (cachedTimes) {
      return cachedTimes;
    }

    var times = [];

    var dfd = $.Deferred();

    hosts.forEach(function (host0) {
      var host = host0;

      if (!(host.startsWith('http://') || host.startsWith('https://'))) {
        host = `https://${host}`;
      }

      getValidResponseTime(host)
        .done(function (res) {
          times.push(res);

          if (times.length === hosts.length) {
            cachedTimes = times;
            dfd.resolve(times);
          }

          if (callback) {
            return callback(res);
          }
        });
    });

    return dfd.promise();
  }

  /**
   * 取得最佳時間的網站
   *
   * @param {string[]} hosts
   * @return {string}
   */
  function getBestHost(hosts) {
    var bestHost;
    var bestTime = 1000000;

    var dfd = $.Deferred();

    testResponseTime(hosts)
      .then(function (times) {
        for (var i = 0; i < times.length; i++) {
          if (times[i].time < bestTime) {
            bestTime = times[i].time;
            bestHost = times[i].host;
          }
        }

        dfd.resolve(bestHost);
      });

    return dfd.promise();
  }

  return {
    getHost,
    encodeHosts,
    testResponseTime,
    getBestHost,
    _clearCache,
  }
})();
