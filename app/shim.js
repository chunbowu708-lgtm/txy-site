// 静态站 API 拦截器：把前端对 /api/v1/* 的 GET 请求重定向到快照 JSON
// （data/api/v1/<path>.json）。必须在应用 bundle 之前加载。
// 另负责 GitHub Pages 的 BrowserRouter 兜底（?p= 参数还原真实路由）。
(function () {
  var BASE = '/txy-site/app/data';

  // --- GitHub Pages SPA 路由还原 ---
  // 404.html 把未知路由重定向到 /app/?p=/app/<route>，
  // 这里无刷新还原成真实路径，交给 react-router 接管。
  try {
    var p = new URLSearchParams(location.search).get('p');
    if (p && p.indexOf('/app/') === 0) {
      history.replaceState(null, '', '/txy-site' + p);
    }
  } catch (e) { /* ignore */ }

  function snapshotUrl(url) {
    try {
      var u = new URL(url, location.origin);
      if (u.origin !== location.origin) return null; // 外链不拦
      if (u.pathname.indexOf('/api/v1/') !== 0) return null;
      return BASE + u.pathname + '.json';
    } catch (e) {
      return null;
    }
  }

  // --- XMLHttpRequest（axios 默认通道）---
  var nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (String(url).indexOf('/api/v1/') >= 0) {
      if (method === 'GET' || method === 'get') {
        var target = snapshotUrl(url);
        if (target) arguments[1] = target;
      } else {
        arguments[1] = BASE + '/_method_not_allowed.json';
      }
    }
    return nativeOpen.apply(this, arguments);
  };

  // --- fetch（流式/局部代码使用）---
  var nativeFetch = window.fetch;
  if (nativeFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      if (url && String(url).indexOf('/api/v1/') >= 0) {
        var method = ((init && init.method) || 'GET').toUpperCase();
        if (method === 'GET') {
          var target = snapshotUrl(url);
          if (target) return nativeFetch(target, init);
        } else {
          return Promise.resolve(
            new Response(JSON.stringify({ detail: '静态站点为只读快照' }), {
              status: 501,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
      }
      return nativeFetch.apply(this, arguments);
    };
  }
})();
