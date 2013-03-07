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
                    if (window.location.pathname.match("/rooms/[^/]+")) {
                        Pusceiver.userRef.child(window.location.pathname).set(1);
                    }
                    // rooms
                    Pusceiver.userRef.child("rooms").on("child_added", function(snapshot) {
                        // console.log(snapshot.name());
                        var room_id = snapshot.name();
                        var roomPath = "/rooms/" + room_id;
                        var $tab = $("<li>").append($("<a>").text("room1").attr({"href": roomPath, "data-target": "#" + room_id}));
                        $("#rooms-tab li:last").before($tab)
                        var roomRef = Pusceiver.rootRef.child(roomPath + "/items");
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
                        if (window.location.pathname == roomPath) {
                            $("a[href='" + roomPath +  "']").tab('show');
                        }
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

// Change rooms
$(document).on("click", '.nav-tabs a', function (e) {
    // No e.preventDefault() here
    e.preventDefault();
    window.history.pushState(null, null, $(this).attr("href"));
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
