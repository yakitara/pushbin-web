// Reuirements (versions are used for development)
// - jQuery 1.9.1
// - Twitter bootstrap 2.3.1
Pusceiver = {
    Room: {
        initItems: function (room_id, path) {
            var itemsRef = Pusceiver.rootRef.child(path);
            $("#" + room_id + " form").attr("action", path);
            itemsRef.on("child_added", function(snapshot) {
                var item_id = snapshot.name();
                var item = snapshot.val();
                var text = $("<pre>").text(item.text).html();
                var html = text.replace(/(https?:\/\/[^\s+]+)/, "<a href='$1'>$1</a>");
                var $text = $("<div>").addClass("text").html(html);
                var li = $("<li/>").attr("id", item_id).prepend($text);
                $("#" + room_id + " .items").prepend(li);
                if (room_id != "private") {
                    var $user = $("<div>").addClass("user").text("user" + item.user_id);
                    li.prepend($user);
                    Pusceiver.rootRef.child("/users/" + item.user_id + "/nickname").on("value", function(snapshot) {
                        $("#" + item_id + " .user").text("@" + snapshot.val());
                    });
                }
            });
        },
        init: function (room_id) {
            var path = "/rooms/" + room_id;
            // clone tab for the room
            var $tab = $("<li>").append($("<a>").attr({"href": path, "data-target": "#" + room_id}));
            $("#rooms-tab li:last").before($tab)
            var $pane = $("#rooms-pane div.tab-pane:last").clone().removeClass("active").attr("id", room_id);
            $pane.find(".share-header").removeClass("hide");
            $pane.find(".members").html("");
            $pane.find("form").attr("action", path + "/items");
            $pane.find(".items").html("");
            $("#rooms-pane div.tab-pane:last").after($pane);
            // items
            this.initItems(room_id, path + "/items")
            // Switch to the room if the URL matched
            if (window.location.pathname == path) {
                $("a[href='" + path +  "']").tab('show');
            }
            // title
            var roomRef = Pusceiver.rootRef.child(path);
            roomRef.on("value", function(roomSnapshot) {
                var room = roomSnapshot.val();
                $("a[href='" + path +  "']").text(room.title);
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
    rootRef: null,
    userRef: null,
    init: function(firebaseUrl) {
        var token = $.cookie('firebaseUserToken');
        this.rootRef = new Firebase(firebaseUrl);
        if (token) {
            this.rootRef.auth(token, function(error, data) {
                if (error) {
                    console.log("auth failed:", error);
                    $(".show-anon").show();
                    $(".hidden-anon").hide();
                } else {
                    console.log("auth data:", data);
                    var user_path = "/users/" + data.auth.id;
                    Pusceiver.userRef = Pusceiver.rootRef.child(user_path);
                    Pusceiver.userRef.update({"nickname": data.auth.nickname});
                    // private room
                    Pusceiver.Room.initItems("private", user_path + "/items");
                    // rooms for the user
                    Pusceiver.userRef.child("rooms").on("child_added", function(snapshot) {
                        var room_id = snapshot.name();
                        Pusceiver.Room.init(room_id);
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
                    $(".show-anon").hide();
                    $(".hidden-anon").show();
                }
            });
        } else {
            $(".show-anon").show();
            $(".hidden-anon").hide();
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
        ".priority": Date.now()
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
