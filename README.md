Pushbin-web
=============

Required Envs
-------------

    FIREBASE_URL

Security rules
--------------

### Set

    curl -X PUT -d @security_rules.json "$FIREBASE_URL.settings/rules.json?auth=$FIREBASE_SECRET"

### Get

    curl -o security_rules.json "$FIREBASE_URL.settings/rules.json?auth=$FIREBASE_SECRET"
