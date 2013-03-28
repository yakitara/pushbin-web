// Reuirements (versions are used for development)
// - jQuery 1.9.1
// - Twitter bootstrap 2.3.1
$.fn.pill = function(action) {
    if (action == "show") {
        var $pill = this.closest("li");
        var $pane = $($(this).data("target"));
        $pill.add($pane).addClass("active").siblings().removeClass("active");
    }
};

Pusceiver = {
    rootRef: null,
    userRef: null,
}
Pusceiver.Room = {}
Pusceiver.Room.initItems = function (room_id, path) {
    $("#" + room_id).find(".nav-pills.item-states > li").each(function() {
        var $pill = $(this);
        var state = $pill.find("a").attr("href");
        var pane_id = room_id + "_" + state;
        $pill.find("a").attr("data-target", "#" + pane_id);
        var $room_pane = $pill.closest(".tab-pane.room");
        var $pane = $room_pane.find(".pill-pane.item-state.template").clone()
            .removeClass("template")
            .attr("id", pane_id);
        $room_pane.find(".pill-content.item-states").append($pane);
        var start = Number($pill.data("start"));
        var itemsRef = Pusceiver.rootRef.child(path).startAt(start).endAt(start + 1);
        // bind items
        var viewModel = {};
        viewModel.items = KnockoutFire.observableArray(itemsRef, {
            "reverseOrder": true,
            "itemExtendFunc": function(item, firebaseRef) {
                item.formatted_text = ko.computed(function() {
                    var text = $("<pre>").text(item.text()).html();
                    return text.replace(/(https?:\/\/[^\s+]+)/, "<a href='$1'>$1</a>");
                });
                item.title = ko.computed(function() {
                    return item.formatted_text().match(/(.*)\n?/)[1];
                });
                item.nickname = ko.observable(item.user_id());
                firebaseRef.root().child("/users/" + item.user_id() + "/nickname").on("value", function(valueSnap) {
                    item.nickname(valueSnap.val());
                });
                item.move = function(data, event) {
                    var start = $(event.currentTarget).data("start");
                    var priority = Number(start) + Number("0." + Date.now());
                    firebaseRef.setPriority(priority)
                };
                item.startPriority = start;
            }
        });
        ko.applyBindings(viewModel, $pane[0]);
    });
    $(room_id + "_backlog").addClass("active");
}
Pusceiver.Room.init = function (room_id, path) {
    // var path = "/rooms/" + room_id + "/";
    // clone tab for the room
    // var $tab = $("<li>").append($("<a>").attr({"href": path, "data-target": "#" + room_id}));
    // $("#rooms-tab li:last").before($tab)
    var $tab = $("ul#rooms-tabs > li.template").clone().removeClass("template");
    $tab.find("a").attr("href", path).attr("data-target", "#" + room_id);
    $("#rooms-tabs > li:last").before($tab);
    var $pane = $("#rooms-pane .tab-pane.room.template").clone()
        .removeClass("template")
        .attr("id", room_id);
    $pane.find(".room-header").removeClass("hide");
    $pane.find(".members").html("");
    var itemsRef = Pusceiver.rootRef.child(path).child("items");
    // bind new item form
    var RoomViewModel = function() {
        var self = this;
        self.textToPush = ko.observable("");
        self.pushItem = function() {
            var val = {
                ".priority": Number("1." + Date.now()),
                "user_id": Pusceiver.userRef.name(),
                "text": this.textToPush()
            };
            itemsRef.push(val);
            this.textToPush("");
        }
    };
    ko.applyBindings(new RoomViewModel(), $pane.find("form")[0]);

    //$pane.find(".items > li:not(.template)").remove();
    $("#rooms-pane div.tab-pane:last").after($pane);
    // items
    this.initItems(room_id, path + "/items");
    // Switch to the room if the URL matched
    //if (window.location.pathname.indexOf(path) == 0) {
    var match = window.location.pathname.match(path + "(.*)");
    if (match) {
        $tab.find("a").tab('show');
        //console.log(match[1]);
        $pane.find(".nav-pills.item-states a[href='" + match[1] + "']").pill("show");
    }
    // title
    $tab.find("a").text(room_id);
    var roomRef = Pusceiver.rootRef.child(path);
    roomRef.on("value", function(roomSnapshot) {
        var room = roomSnapshot.val();
        $tab.find("a").text(room.title);
    });
    // members
    roomRef.child("members").on("child_added", function(snapshot) {
        var user_id = snapshot.name();
        var $member = $("<span>").addClass("user-" + user_id).append($("<i>").addClass("icon-user"), "user" + snapshot.name());
        if (snapshot.val().online) {
            $member.removeClass("offline");
        } else {
            $member.addClass("offline");
        }
        $("#" + room_id + " .members").append($member);
        Pusceiver.rootRef.child("/users/" + user_id + "/nickname").on("value", function(snapshot) {
            $("#" + room_id + " .user-" + user_id).text("@" + snapshot.val());
        });
    });
    roomRef.child("members").on("child_removed", function(oldSnapshot) {
        var user_id = oldSnapshot.name();
        $("#" + room_id + " .members .user-" + user_id).remove();
    });
    // online status
    roomRef.child("members").on("child_changed", function(snapshot) {
        var user_id = snapshot.name();
        var $member = $("#" + room_id + " .user-" + user_id);
        if (snapshot.val().online) {
            $member.removeClass("offline");
        } else {
            $member.addClass("offline");
        }
    });
}
Pusceiver.User = {}
Pusceiver.User.init = function(auth) {
    var user_path = "/users/" + auth.id;
    Pusceiver.userRef = Pusceiver.rootRef.child(user_path);
    Pusceiver.userRef.update({"nickname": auth.nickname});
    // private room
    Pusceiver.Room.init("private", user_path + "/items/");
    // other rooms
    Pusceiver.userRef.child("rooms").on("child_added", function(snapshot) {
        var room_id = snapshot.name();
        Pusceiver.Room.init(room_id, "/rooms/" + room_id + "/");
    });
    // Update own presence
    Pusceiver.rootRef.child('/.info/connected').on('value', function(snap) {
        var connected = snap.val();
        console.log("connected: " + connected);
        Pusceiver.userRef.child("rooms").on("child_added", function(roomSnapshot) {
            var memberRef = Pusceiver.rootRef.child("/rooms/" + roomSnapshot.name() + "/members/" + auth.id);
            memberRef.onDisconnect().update({"online": false})
            memberRef.update({"online": connected}, function(error) {
                if (error) {
                    console.log(error);
                }
            });
        });
    });
    // join or switch to the room specified in URL
    var match = window.location.pathname.match("/(rooms/[^/]+)");
    if (match) {
        Pusceiver.userRef.child(match[1]).set(1);
    }
    // nickname
    $("#user").text("@" + auth.nickname);
}
Pusceiver.init = function(firebaseUrl) {
    var token = $.cookie('firebaseUserToken');
    this.rootRef = new Firebase(firebaseUrl);
    if (token) {
        this.rootRef.auth(token, function(error, data) {
            if (error) {
                console.log("auth failed:", error);
                $("body").removeClass("is-loggedin");
            } else {
                console.log("auth data:", data);
                Pusceiver.User.init(data.auth);
                $("body").addClass("is-loggedin");
            }
        }, function(error) {
            // onCancel
            console.log("onCancel: " + error);
            $("body").removeClass("is-loggedin");
        });
    } else {
        $("body").removeClass("is-loggedin");
    }
}

// Switch rooms
$(document).on("click", '.nav-tabs a', function (e) {
    // No e.preventDefault() here
    e.preventDefault();
    window.history.pushState(null, null, $(this).attr("href"));
    $(this).tab('show');
});

// New room
$("a[href='#new-room']").click(function() {
    var room = Pusceiver.rootRef.child("/rooms").push({title: "New room"});
    var path = "rooms/" + room.name();
    window.history.pushState(null, null, "/" + path);
    Pusceiver.userRef.child(path).set(1);
    return false;
});

// Edit room
$(document).on("click", "a[href='#room-edit']", function(e) {
    var room_id = $(this).closest(".tab-pane").prop("id");
    Pusceiver.rootRef.child("/rooms/" + room_id).once("value", function(roomSnapshot) {
        var room = roomSnapshot.val();
        $("#room-edit input[name='title']").val(room.title);
        $("#room-edit form").prop("action", roomSnapshot.ref().path.toString());
        $("#room-edit").modal();
    });
    return false;
});
// Update room
$(document).on("submit", "#room-edit form", function(e) {
    e.preventDefault();
    var path = $(this).attr("action");
    var val = $(this).serializeObject();
    Pusceiver.rootRef.child(path).update(val, function(error) {
        if (error) {
            console.log(error);
        } else {
            $("#room-edit").modal('hide');
        }
    });
});
// Leave room
$(document).on("click", "a[href='#room-leave']", function(e) {
    var $pane = $(this).closest(".tab-pane").remove();
    var room_id = $pane.attr("id");
    $("[data-target='#" + room_id + "']").remove();
    Pusceiver.userRef.child("rooms/" + room_id).remove(function(error) {
        $("a[data-target='#private']").tab("show");
    });
    return false;
});

// Switch states
$(document).on("click", '.nav-pills a', function (e) {
    // No e.preventDefault() here
    e.preventDefault();
    window.history.pushState(null, null, $(this).attr("href"));
    $(this).pill('show');
    // var $pill = $(this).closest("li");
    // var $pane = $($(this).data("target"));
    // $pill.add($pane).addClass("active").siblings().removeClass("active");
    return false;
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
