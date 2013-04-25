// Reuirements (versions are used for development)
// - jQuery 1.9.1
// - Twitter bootstrap 2.3.1
// - KnockoutJs 2.2.1
// - Firebase
// - [KnockoutFire](https://github.com/hiroshi/KnockoutFire)

$.fn.pill = function(action) {
    if (action == "show") {
        var $pill = this.closest("li");
        var $pane = $($(this).data("target"));
        $pill.add($pane).addClass("active").siblings().removeClass("active");
    }
};
// http://jsfiddle.net/rniemeyer/tWJxh/
ko.bindingHandlers.stopBindings = {
    init: function() {
        return { controlsDescendantBindings: true };
    }  
};
/*
  pushbinUser KnockoutJs extender
*/
ko.extenders.pushbinUser = function(user) {
    var trashesRef = user.firebase.child("items").endAt(0).limit(20);
    var trashes = KnockoutFire.observable(trashesRef, {
        "$item": {
            ".extend": {"pushbinItem": {}},
            "text": true
        }
    });
    user().tabs = [
        {"id": "items", "items": user().items, "icon": "inbox"},
        {"id": "trashes", "items": trashes, "icon": "trash"},
    ];
};
/*
  pushbinItem KnockoutJs extender
*/
ko.extenders.pushbinItem = function(item, options) {
    item().formatted_text = ko.computed(function() {
        var text = $("<pre>").text(item().text()).html();
        return text.replace(/(https?:\/\/[^\s+]+)/, "<a href='$1'>$1</a>");
    });
    item().title = ko.computed(function() {
        return item().formatted_text().match(/(.*)\n?/)[1];
    });
    item().trash = function() {
        item.firebase.setPriority(- Date.now());
    }
    item().undo = function() {
        item.firebase.setPriority(Date.now());
    }
    item().editable = options.editable;
};
/*
  Pushbin
*/
Pushbin = {
    rootRef: null,
    userRef: null,
}
Pushbin.User = {};
Pushbin.User.init = function(auth) {
    var user_path = "/users/" + auth.id;
    Pushbin.userRef = Pushbin.rootRef.child(user_path);
    Pushbin.userRef.update({"screen_name": auth.screen_name});
    var viewModel = KnockoutFire.observable(
        Pushbin.userRef, 
        {
            ".extend": {"pushbinUser": null},
            "items": {
                ".startAt": 0,
                ".limit": 20,
                ".reverse": true,
                ".newItem": {
                    ".priority": function() { return Date.now() }
                },
                "$item": {
                    ".extend": {"pushbinItem": {"editable": true}},
                    "text": true
                }
            }
        }
    );
    ko.applyBindings(viewModel, $("#ko-bind-user")[0]);
    // screen_name
    $("#login-name").text("@" + auth.screen_name);
}
Pushbin.init = function(firebaseUrl) {
    this.rootRef = new Firebase(firebaseUrl);
    this.authClient = new FirebaseAuthClient(this.rootRef, function(error, user) {
        if (error) {
            console.log("auth failed:", error);
            $("body").removeClass("is-loggedin");
        } else if (user) {
            console.log("user:", user);
            $("body").addClass("is-loggedin");
            Pushbin.User.init(user);
        } else {
            $("body").removeClass("is-loggedin");
        }
    });
};
$("#login-twitter").on("click", function(e) {
    Pushbin.authClient.login('twitter');
});
// select an item
$(document).on("click", ".item", function(e) {
    if (!$(this).find("[href='#item-edit']").hasClass("active")) {
        if ($(e.target).hasClass("activate")) {
            $(this).toggleClass("active");
        }
    }
    return false;
});
// edit an item
$(document).on("click", "a[href='#item-edit']", function(e) {
    var $item = $(this).closest(".item");
    var $textarea = $item.find("textarea[name='text']");
    $item.toggleClass("edit");
    return false;
});
