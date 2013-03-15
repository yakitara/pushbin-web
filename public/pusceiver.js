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
    Room: {
        initItems: function (room_id, path) {
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
                Pusceiver.Room.initStateItems(room_id, path, $pane, start);
            });
            $(room_id + "_backlog").addClass("active");
            // this.initStateItems(room_id, path, 1);
        },
        initStateItems: function (room_id, path, $pane, start) {
            //var $room_pane = $("#" + room_id);
            var itemsRef = Pusceiver.rootRef.child(path).startAt(start).endAt(start + 1);
            itemsRef.on("child_added", function(snapshot) {
                var item_id = snapshot.name();
                var item = snapshot.val();
                var $item = $pane.find("li.item.template").clone()
                    .removeClass("template hide")
                    .data("path", snapshot.ref().path.toString())
                    .attr("id", item_id);
                $pane.find(".items").prepend($item);
                if (room_id != "private") {
                    $item.find(".user").text("user" + item.user_id);
                    Pusceiver.rootRef.child("/users/" + item.user_id + "/nickname").on("value", function(snapshot) {
                        $("#" + item_id + " .user").text("@" + snapshot.val());
                    });
                }
                // text changed
                snapshot.ref().on("value", function(itemSnapshot) {
                    var item = itemSnapshot.val()
                    if (item) {
                        var text = $("<pre>").text(item.text).html();
                        var html = text.replace(/(https?:\/\/[^\s+]+)/, "<a href='$1'>$1</a>");
                        $item.find(".text").html(html);
                        $item.find(".title").html(html.match(/(.*)\n?/)[1]);
                    }
                });
            });
            // on child_removed
            itemsRef.on("child_removed", function(snapshot) {
                $("#" + snapshot.name()).remove();
            });
            // on child_moved
            itemsRef.on("child_moved", function(snapshot, prevChildName) {
                $pane.find(".items").prepend($("#" + snapshot.name()).detach());
            });
        },
        init: function (room_id, path) {
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
            $pane.find("form").attr("action", path + "/items");
            $pane.find(".items > li:not(.template)").remove();
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
    },
    User: {
        init: function(auth) {
            
        }
    },
    init: function(firebaseUrl) {
        var token = $.cookie('firebaseUserToken');
        this.rootRef = new Firebase(firebaseUrl);
        if (token) {
            this.rootRef.auth(token, function(error, data) {
                if (error) {
                    console.log("auth failed:", error);
                    $("body").removeClass("is-loggedin");
                } else {
                    console.log("auth data:", data);
                    var user_path = "/users/" + data.auth.id;
                    Pusceiver.userRef = Pusceiver.rootRef.child(user_path);
                    Pusceiver.userRef.update({"nickname": data.auth.nickname});
                    // private room
                    //$("#private form").attr("action", user_path + "/items");
                    //Pusceiver.Room.initItems("private", user_path + "/items");
                    Pusceiver.Room.init("private", user_path + "/items/");
                    // rooms for the user
                    Pusceiver.userRef.child("rooms").on("child_added", function(snapshot) {
                        var room_id = snapshot.name();
                        Pusceiver.Room.init(room_id, "/rooms/" + room_id + "/");
                        var memberRef = Pusceiver.rootRef.child("/rooms/" + room_id + "/members/" + data.auth.id);
                        memberRef.onDisconnect().update({"online": false})
                        // memberRef.update({"online": true})
                        //
                        Pusceiver.rootRef.child('/.info/connected').on('value', function(snap) {
                            console.log("connected: " + snap.val());
                            memberRef.update({"online": snap.val()});
                        });
                    });
                    // join or switch to the room specified in URL
                    var match = window.location.pathname.match("/(rooms/[^/]+)");
                    if (match) {
                        Pusceiver.userRef.child(match[1]).set(1);
                    }
                    //
                    $("#user").text("@" + data.auth.nickname);
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
};

// Push an item
$(document).on("submit", "#rooms-pane form", function(e) {
    var $form = $(this);
    var $textarea = $form.find("textarea");
    var path = $form.attr("action");
    var val = {
        "text": $textarea.val(),
        "user_id": Pusceiver.userRef.name(),
        ".priority": Number("1." + Date.now())
    };
    Pusceiver.rootRef.child(path).push(val, function(error) {
        if (!error) {
            $textarea.val("");
        } else {
            alert(error);
        }
    });
    return false;
});

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
// make an item done
$(document).on("click", "a[href='#item-done']", function(e) {
    var itemRef = Pusceiver.rootRef.child($(this).closest(".item").data("path"));
    var priority = -1 + Number("0." + Date.now());
    itemRef.setPriority(priority, function(error) {
        if (error) {
            console.log(error);
        }
    });
    // itemRef.transaction(function(data) {
    //     itemRef.parent().parent().child("done/" + itemRef.name()).setWithPriority(data, Date.now());
    //     return null;
    // });
    return false;
});
// edit an item
$(document).on("click", "a[href='#item-edit']", function(e) {
    var $item = $(this).closest(".item");
    var $textarea = $item.find("textarea[name='text']");
    if (!$item.hasClass("edit")) {
        var itemRef = Pusceiver.rootRef.child($item.data("path"));
        itemRef.once("value", function(snapshot) {
            $textarea.val(snapshot.val().text);
            $textarea.on("keyup", function(e) {
                var val = $(this).closest("form").serializeObject();
                itemRef.update(val);
            });
            $item.addClass("edit");
        });
    } else {
        $textarea.off("keyup");
        $item.removeClass("edit");
    }
    return false;
});
// move an item to top
$(document).on("click", "a[href='#item-top']", function(e) {
    var itemRef = Pusceiver.rootRef.child($(this).closest(".item").data("path"));
    var priority = Number("1." + Date.now())
    itemRef.setPriority(priority, function(error) {
        if (error) {
            console.log(error);
        }
    });
});
