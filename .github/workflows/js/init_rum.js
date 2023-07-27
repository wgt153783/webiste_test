window.addEventListener("load", function () {
  elasticApm.init({
    serviceName: window.location.hostname.replace(/\./g,'-'),
    serverUrl: 'https://lalala.jiabavee.com:8200',
    serverUrlPrefix: '/intake/v2/api/events'
  })
});


