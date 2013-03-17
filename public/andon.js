/*
  Andon.js - Bind DOM with Firebase


  Requirements: jQuery and firebase.js

  TODO: Form support
  TODO: on("value") for a single object
  TODO: on("child_removed) for a list
  TODO: The data attribute name "data-name" doesn't seem to be appropriate? "data-andon"?
  TODO: jQuery independent (For prototyping it's easy to use jQuery, so I use jQuery so far, but some user don't want jQuery.

  Author: Hiroshi Saito <hiroshi3110@gmail.com>
  License: CC BY 2.0
*/
Andon = {
    version: "0.0.0", // yet prototype version
    filters: {
        "safe": function(val) { return val; } // placeholder
    }
}
/*
  Bind $target, a jquery object, with firebase reference or query.

  Uage example:
    # firebase
    {
      comments: {
        -XXXX: {
          user: "anon"
          text: "What andon mean?"
        }
        -YYYY: {
          user: "hiroshi"
          text: "A kind of Japanese paper lantern. A Candle fire lighten it from inside."
        }
      }
    }
    <!-- html -->
    <style type="text/stylesheet">
      .template { display:none; }
    </style>
    <ul id="comments">
      <li class="template">
        <span data-name="user"></span>
        <pre data-name="text"></pre>
      </li>
    </ul>
    <script type="text/javascript">
      Andon.bind($("#comments"), new Firebase("https://yourdb.firebaseio-demo.com/comments"));
    </script>

  Arguments:
    $target:
      Target jQuery object.
      $target.children(".template").length > 0: use on("child_added"), otherwise on("value")
    firebase:
      Firebase reference or query
    options:
      prepend: (default: true)
        If true prepend children to $target otherwise append them.

  Data attributes:
    data-name:
      Format: name[:reference][|filter1|filter2|...]
      Examples:
        "title"      -> $(this).text(val);
        "title|safe" -> $(this).html(val);
        "user_id:/users/$/nickname"

*/
Andon.bind = function ($target, firebase, options) {
    options = $.extend({prepend: true}, options)
    var child_template = $target.children(".template");
    if (child_template.length > 0) {
        firebase.on("child_added", function(childSnapshot) {
            var $child = child_template.clone().removeClass("template")
                .attr("data-path", childSnapshot.ref().path.toString());
            if (options.prepend) {
                $target.prepend($child);
            } else {
                $target.append($child);
            }
            $child.find("[data-name]").each(function() {
                var $name = $(this);
                var name_and_filters = $name.data("name").split("|");
                var name_and_ref = name_and_filters[0].split(":");
                var name = name_and_ref[0];
                var ref = name_and_ref[1];
                var path = name.replace(".", "/");
                var filters = name_and_filters.slice(1);
                //var func = options.functions[name];
                childSnapshot.ref().child(path).on("value", function(valueSnapshot) {
                    if (ref) {
                        // e.g. "/users/$/nickname" -> "/users/1234/nickname"
                        var ref_path = ref.replace("$", valueSnapshot.val());
                        var base_ref = childSnapshot.ref();
                        if (ref_path[0] == '/') {
                            base_ref = base_ref.root();
                        }
                        base_ref.child(ref_path).on("value", function(valRefSnapshot) {
                            $name.html(Andon.applyFilters(valRefSnapshot.val(), filters));
                        });
                    }
                    $name.html(Andon.applyFilters(valueSnapshot.val(), filters));
                });
            });
        });
        firebase.on("child_moved", function(childSnapshot, prevChildName) {
            var path = childSnapshot.ref().path.toString();
            var prev_path = prevChildName ? path.replace(childSnapshot.name(), prevChildName) : null;
            var $detached = $target.children("[data-path='" + path + "']").detach();
            if (options.prepend) {
                if (prev_path) {
                    $target.children("[data-path='" + prev_path + "']").before($detached);
                } else {
                    $target.prepend($detached);
                }
            } else {
                if (prev_path) {
                    $target.children("[data-path='" + prev_path + "']").after($detached);
                } else {
                    $target.append($detached);
                }
            }
        });
    } else {
        console.error("Not implemented yet.");
    }
}
/*
  Register a filter
*/
Andon.registerFilter = function (name, func) {
    Andon.filters[name] = func;
}
/*
  Internal functions
*/
Andon.applyFilters = function (val, filters) {
    filters.forEach(function(filter) {
        var func = Andon.filters[filter];
        if (func) {
            val = func(val);
        } else {
            console.error("Andon.js: No such filter: " + filter);
        }
    });
    if (filters.indexOf("safe") == -1) {
        val = $("<pre>").text(val).html();
    }
    return val;
}
