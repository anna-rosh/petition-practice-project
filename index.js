const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const db = require('./db');
const bc = require('./bc');
const cookieSession = require('cookie-session');
const csurf = require('csurf'); // get csurf middleware to prevent csrf
const { hash } = require('bcryptjs');


////////// HANDLEBARS SETTINGS /////////
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');


////////// MIDDLEWARE ////////////
app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);

app.use(express.urlencoded({ extended: false }));

app.use(csurf());

app.use(function (req, res, next) {
    // provide my templates with csrfToken
    res.locals.csrfToken = req.csrfToken();
    // prevent clickjacking
    res.setHeader("x-frame-options", "deny");
    next();
});

app.use(express.static('./public'));


///////////// ROOT ROUTE REQUESTS ////////////
app.get('/', (req, res) => {
    res.redirect('/petition');
});

//////////// PETITION REQUESTS /////////
app.get('/petition', (req, res) => {

    if (req.session.sigId) {
        res.redirect("/thanks");
    } else {
        res.render('petition', {
            layout: 'main',
        }); 
    }

});


app.post('/petition', (req, res) => {
    // get the user data from the request
    const { first, last, signature } = req.body;
    // use this data to create a new row in the database
    db.addSignature(first, last, signature)
        .then(({ rows }) => {

            const { id } = rows[0]; 
            // create a new id prop to store in cookies to have access to it 
            // for subsequent requiests
            req.session.sigId = id;
        
            res.redirect('/thanks');

        })
        .catch((err) => {

            console.log('ERR in addSignature: ', err);

            res.render('petition', {
                layout: 'main',
                helpers: {
                    addVisibility() {
                        return 'visible';
                    }
                }
            });
        }); // closes catch

}); // closes post request on /petition


/////////////// THANKS REQUESTS ////////////////
app.get('/thanks', (req, res) => {

    if (!req.session.sigId) {
        res.redirect('/petition');
    } else {
        // find the current id in cookies
        let currSigId = req.session.sigId;

        db.countRows()
            .then(({ rows:allRows }) => {

                db.getCurrRow(currSigId).then(({ rows:currRow }) => {
                    res.render('thanks', {
                        layout: 'main',
                        currRow,
                        allRows
                    });
                }).catch(err => console.log('error in getSigUrl: ', err)); // catch for getSigUrl

            })
            .catch((err) => {
                console.log('err in getSigUrl: ', err);
            }); // catch for countRows
    } // closes else statement

}); // closes get request on /thanks

////////////////// SIGNERS REQUESTS ////////////////
app.get('/signers', (req, res) => {

    if (!req.session.sigId) {
        res.redirect('/petition');
    } else {

        db.getNames()
            .then(({ rows }) => {
                res.render('signers', {
                    layout: 'main',
                    rows
                });
            })
            .catch((err) => console.log('err in getNames: ', err));
        
    } // closes else statement

}); // closes get request on /signers

////////////////// REGISTER REQUESTS //////////////////
app.get('/register', (req, res) => {

    res.render('register', {
        layout: 'main'
    });

});



app.post('/register', (req, res) => {

    let { first, last, email, password } = req.body;

    bc.hash(password)
        .then((hashedPassword) => {

            db.addUser(first, last, email, hashedPassword)
                .then(({ rows }) => {

                    const { id } = rows;

                    req.session.userId = id;

                    res.redirect('/petition');
                    
                })
                .catch((err) => {
                    console.log("ERR in addUser: ", err);

                    res.render("register", {
                        layout: "main",
                        helpers: {
                            addVisibility() {
                                return "visible";
                            },
                        },
                    });
                });

        })
        .catch((err) => console.log('err in hash: ', err));

});


/////////////// LOGIN REQUESTS /////////////////
app.get('/login', (req, res) => {

    res.render("login", {
        layout: "main",
    });

});

app.post('/login', (req, res) => {

    const { email, password } = req.body;

    db.checkPassword(email)
        .then(( {rows} ) => {
            
            const { password:encodedPassword, id } = rows[0];

            bc.compare(password, encodedPassword)
                .then((result) => {

                    if (result == true) {
                        req.session.userId = id;

                        if(req.session.sigId) {
                            res.redirect('/thanks');
                        } else {
                            res.redirect('/petition');
                        }
                    } else {
                        res.render("login", {
                            layout: "main",
                            helpers: {
                                addVisibility() {
                                    return "visible";
                                },
                            },
                        });
                    }
                
                })
                .catch(err => console.log('err in compare: ', err)); // closes catch on compare

        })
        .catch((err) => {
            console.log('err in checkPassword: ', err);

            res.render("login", {
                layout: "main",
                helpers: {
                    addVisibility() {
                        return "visible";
                    },
                },
            });
        });

});


app.listen(8080, () => console.log('my petition server is running 🚴‍♀️'));