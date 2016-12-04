/*
Riot 1.0.0, @license MIT, (c) 2014 Muut Inc + contributors
Annotations by plumpNation 2016
*/
(function(riot) { "use strict";

riot.observable = function(el) {
  var callbacks = {}, slice = [].slice;

  el.on = function(events, fn) {
    if (typeof fn === "function") {
      events.replace(/[^\s]+/g, function(name, pos) {
        (callbacks[name] = callbacks[name] || []).push(fn);
        fn.typed = pos > 0;
      });
    }
    return el;
  };

  el.off = function(events) {
    events.replace(/[^\s]+/g, function(name) {
      callbacks[name] = [];
    });
    if (events == "*") callbacks = {};
    return el;
  };

  // only single event supported
  el.one = function(name, fn) {
    if (fn) fn.one = true;
    return el.on(name, fn);
  };

  el.trigger = function(name) {
    var args = slice.call(arguments, 1),
      fns = callbacks[name] || [];

    for (var i = 0, fn; (fn = fns[i]); ++i) {
      if (!fn.busy) {
        fn.busy = true;
        fn.apply(el, fn.typed ? [name].concat(args) : args);
        if (fn.one) { fns.splice(i, 1); i--; }
        fn.busy = false;
      }
    }

    return el;
  };

  return el;

};

// `FN` stores pre 'compiled' template functions
var FN = {},

  // `template_escape` is mappings from common characters found in templates to
  // safe versions of the characters.
  template_escape = {"\\": "\\\\", "\n": "\\n", "\r": "\\r", "'": "\\'"},

  // Basically a very short list of html special characters to convert in the
  // render process via `default_escape_fn`
  render_escape = {'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'};

/**
 * An escape function is either provided by the user or this one is fallen back
 * onto. It will run on the value that is to be inserted into the template.
 */
// It looks as though `key` is unused by this function, so it's likely it is
// here to anticipate how this function may be used by those requiring a custom
// escape function.
function default_escape_fn(str, key) {
  // The replace regex matches the `render_escape` mapping object.
  // If the template:
  // ```html
  // <div>{foobar}</div>
  // ```
  // was given as the `str` parameter then the returned
  // value would read:
  // ```html
  // &lt;div&gt;{foobar}&lt;/div&gt;
  // ```
  return str == undefined ? '' : (str+'').replace(/[&\"<>]/g, function(char) {
    return render_escape[char];
  });
}

riot.render = function(tmpl, data, escape_fn) {
  // The `escape_fn` can be provided by the user, but it defaults to `default_escape_fn`
  if (escape_fn === true) escape_fn = default_escape_fn;
  tmpl = tmpl || '';

  // `FN[tmpl]` is either used or set to a new function.
  // With given template:
  // ```html
  // <div>{foobar}</div>
  // ```

  // The function to be cached in the FN object looks like this:
  // ```javascript
  // function (data, escape_fn) {
  //   try {
  //     return '<div>' +
  //       (escape_fn ? escape_fn(data.foobar, 'foobar') : data.foobar || (data.foobar == undefined ? '' : data.foobar)) +
  //     '</div>';
  //   } catch(e) { return '' }
  // }
  // ```
  return (FN[tmpl] = FN[tmpl] || new Function("_", "e", "try { debugger; return '" +
    // this regex replace matches values in template_escape
    tmpl.replace(/[\\\n\r']/g, function(char) {
      return template_escape[char];
    })
    .replace(
        /{\s*([\w\.]+)\s*}/g,
        // The `escape_fn ? escape_fn(data.foobar, 'foobar') ...` will be
        // inserted in the place of every {variable} in the template.
        //
        // If rewritten in simpler javascript it looks like this:
        // ```javascript
        // var value;
        //
        // if (escape_fn) {
        //     value = escape_fn(data.property);
        // } else {
        //     value = data.property;
        // }
        //
        // if (value === undefined || value === null) {
        //     value = '';
        // }
        // ```
        "' + (e?e(_.$1,'$1'):_.$1||(_.$1==undefined?'':_.$1)) + '")
      + "' } catch(e) { return '' }"
    )

  )(data, escape_fn);

};

/* Cross browser popstate */

// for browsers only
if (typeof top != "object") return;

var currentHash,
  pops = riot.observable({}),
  listen = window.addEventListener,
  doc = document;

function pop(hash) {
  hash = hash.type ? location.hash : hash;
  if (hash != currentHash) pops.trigger("pop", hash);
  currentHash = hash;
}

/* Always fire pop event upon page load (normalize behaviour across browsers) */

// standard browsers
if (listen) {
  listen("popstate", pop, false);
  doc.addEventListener("DOMContentLoaded", pop, false);

// IE
} else {
  doc.attachEvent("onreadystatechange", function() {
    if (doc.readyState === "complete") pop("");
  });
}

/* Change the browser URL or listen to changes on the URL */
riot.route = function(to) {
  // listen
  if (typeof to === "function") return pops.on("pop", to);

  // fire
  if (history.pushState) history.pushState(0, 0, to);
  pop(to);

};})(typeof top == "object" ? window.riot = {} : exports);
