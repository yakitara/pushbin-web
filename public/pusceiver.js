Pusceiver = {
    rootRef: null,
    itemsRef: null,
    init: function(firebaseUrl) {
        var token = $.cookie('firebaseUserToken');
        this.rootRef = new Firebase(firebaseUrl);
        if (token) {
            this.rootRef.auth(token, function(error, data) {
                if (error) {
                    console.log("auth failed:", error);
                    $(".show-anon").show();
                    $(".hidden-anon").hide();
                    // $("#login").show();
                    // $("#user").hide();
                } else {
                    console.log("auth data:", data);
                    Pusceiver.itemsRef = Pusceiver.rootRef.child("users/" + data.auth.id + "/items");
                    Pusceiver.itemsRef.on("child_added", function(snapshot, prevChildName) {
                        var text = $("<pre>").text(snapshot.val()).html(),
                            html = text.replace(/(https?:\/\/[^\s+]+)/, "<a href='$1'>$1</a>")
                        $("#items").prepend($("<li/>").html(html));
                    });
                    //Pusceiver.currentUser
                    //$("#login").hide();
                    //$("#user").show().text("@" + data.auth.nickname);
                    $("#user").text("@" + data.auth.nickname);
                    $(".show-anon").hide();
                    $(".hidden-anon").show();
                }
            });
        } else {
            $(".show-anon").show();
            $(".hidden-anon").hide();
            // $("#login").show();
            // $("#user").hide();
        }
    }
};

$("form").submit(function() {
    var $textarea = $(this).find("textarea");
    Pusceiver.itemsRef.push({".value": $textarea.val(), ".priority": Date.now()}, function(error) {
        if (!error) {
            $textarea.val("");
        } else {
            alert(error);
        }
    });
    return false;
});
