Pusceiver = {
    rootRef: null,
    authClient: null,
    itemsRef: null,
    init: function(firebaseUrl) {
        var token = $.cookie('firebaseUserToken');
        this.rootRef = new Firebase(firebaseUrl);
        if (token) {
            this.rootRef.auth(token, function(error, data) {
                if (error) {
                    console.log("auth failed:", error);
                } else {
                    console.log("auth data:", data);
                    Pusceiver.itemsRef = Pusceiver.rootRef.child("users/" + data.auth.id + "/items");
                    Pusceiver.itemsRef.on("child_added", function(snapshot, prevChildName) {
                        $("#items").prepend($("<li/>").text(snapshot.val()));
                    });
                    Pusceiver.currentUser
                    $("#login").hide();
                    $("#user").show().text("@" + data.auth.nickname);
                }
            });
        } else {
            $("#login").show();
            $("#user").hide();
        }
        // this.authClient = new FirebaseAuthClient(this.rootRef, function(error, user) {
        //     if (error) {
        //         // an error occurred while attempting login
        //         console.log(error);
        //     } else if (user) {
        //         Pusceiver.currentUser = user;
        //         // user authenticated with Firebase
        //         console.log('User ID: ' + user.id + ', Provider: ' + user.provider);
        //         Pusceiver.itemsRef = Pusceiver.rootRef.child("users/" + user.id + "/items");
        //         Pusceiver.itemsRef.on("child_added", function(snapshot, prevChildName) {
        //             $("#items").prepend($("<li/>").text(snapshot.val()));
        //         });
        //         $("#login").hide();
        //         $("#user").show().text("@" + user.displayName);
        //     } else {
        //         // user is logged out
        //         console.log('not logged in');
        //         $("#login").show();
        //         $("#user").hide();
        //         Pusceiver.currentUser = null;
        //     }
        // });
    },
    login: function() {
        this.authClient.login('twitter');
    }
    // logout: function() {
    //     this.rootRef.unauth();
    // }
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
