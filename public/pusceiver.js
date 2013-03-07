Pusceiver = {
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
                    Pusceiver.userRef = Pusceiver.rootRef.child("users/" + data.auth.id);
                    // users/$uid/items
                    var itemsRef = Pusceiver.userRef.child("items");
                    $("#private form").attr("action", itemsRef.path.toString());
                    itemsRef.on("child_added", function(snapshot, prevChildName) {
                        var text = $("<pre>").text(snapshot.val()).html(),
                            html = text.replace(/(https?:\/\/[^\s+]+)/, "<a href='$1'>$1</a>")
                        $("#private .items").prepend($("<li/>").html(html));
                    });
                    // direct room
                    var room_id = window.location.hash.replace(/^#/, "");
                    //hash && $('ul.nav a[href="' + hash + '"]').tab('show');
                    //Pusceiver.rootRef.child("/rooms/" + hash)
                    if (room_id && room_id != "private") {
                        Pusceiver.userRef.child("rooms/" + room_id).set(1);
                    }
                    // rooms
                    Pusceiver.userRef.child("rooms").on("child_added", function(snapshot) {
                        // console.log(snapshot.name());
                        var room_id = snapshot.name();
                        var $tab = $("<li>").append($("<a>").text("room1").attr({"href": "#" + room_id}));
                        $("#rooms-tab li:last").before($tab)
                        var roomRef = Pusceiver.rootRef.child("rooms/" + room_id + "/items");
                        var $pane = $("#rooms-pane div.tab-pane:last").clone().removeClass("active").attr("id", room_id);
                        $pane.find("form").attr("action", roomRef.path.toString());
                        $pane.find(".items").html("");
                        $("#rooms-pane div.tab-pane:last").after($pane);
                        roomRef.on("child_added", function(itemSnapshot) {
                            console.log("room item added:", itemSnapshot);
                            var text = $("<pre>").text(itemSnapshot.val()).html(),
                            html = text.replace(/(https?:\/\/[^\s+]+)/, "<a href='$1'>$1</a>")
                            $("#" + room_id + " .items").prepend($("<li/>").html(html));
                        });
                    });
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

$(document).on("click", "#rooms-pane input[type='submit']", function(e) {
    var $form = $(this).closest("form");
    var $textarea = $form.find("textarea");
    var path = $form.attr("action");
    Pusceiver.rootRef.child(path).push({".value": $textarea.val(), ".priority": Date.now()}, function(error) {
        if (!error) {
            $textarea.val("");
        } else {
            alert(error);
        }
    });
    return false;
});

$(document).on("click", '.nav-tabs a', function (e) {
    // No e.preventDefault() here
    $(this).tab('show');
});

// New room
$("a[href='#new-room']").click(function() {
    var room = Pusceiver.rootRef.child("/rooms").push();
    Pusceiver.userRef.child("rooms/" + room.name()).set(1);
    return false;
});

// Join room
// $(function() {
//     var hash = window.location.hash;
//     //hash && $('ul.nav a[href="' + hash + '"]').tab('show');
//     //Pusceiver.rootRef.child("/rooms/" + hash)
//     if (hash && hash != "private") {
//         Pusceiver.userRef.child("rooms/" + hash).set(1);
//     }
// });
