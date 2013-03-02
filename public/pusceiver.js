Pusceiver = {
    rootRef: null,
    authClient: null,
    currentUser: null,
    itemsRef: null,
    init: function(firebaseUrl) {
        this.rootRef = new Firebase(firebaseUrl);
        this.authClient = new FirebaseAuthClient(this.rootRef, function(error, user) {
            if (error) {
                // an error occurred while attempting login
                console.log(error);
            } else if (user) {
                Pusceiver.currentUser = user;
                // user authenticated with Firebase
                console.log('User ID: ' + user.id + ', Provider: ' + user.provider);
                Pusceiver.itemsRef = Pusceiver.rootRef.child("users/" + user.id + "/items");
                Pusceiver.itemsRef.on("child_added", function(snapshot, prevChildName) {
                    $("#items").prepend($("<li/>").text(snapshot.val()));
                });
                $("#login").hide();
                $("#user").show().text("@" + user.displayName);
            } else {
                // user is logged out
                console.log('not logged in');
                $("#login").show();
                $("#user").hide();
                Pusceiver.currentUser = null;
            }
        });
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
