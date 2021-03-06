var http = require( 'http' );
var Router = require( './router' );
var ecstatic = require( 'ecstatic' );
var DB = require( './db' );

var fileServer = ecstatic( {
    root: './public'
} );
var router = new Router();
var db = new DB();

//Initialize the server
http.createServer( function( request, response ) {
    if ( !router.resolve( request, response ) )
        fileServer( request, response );
} ).listen( 3000 );
console.log('Listening on port 3000...');

function respond( response, status, data, type ) {
    response.writeHead( status, {
        'Content-Type': type || 'text/plain'
    } );
    response.end( data );
}

function respondJSON( response, status, data ) {
    respond( response, status, JSON.stringify( data ), 'application/json' );
}

function readStreamAsJSON( stream, callback ) {
    var data = '';
    stream.on( 'data', function( chunk ) {
        data += chunk;
    } );
    stream.on( 'end', function() {
        var result, error;
        try {
            result = JSON.parse( data );
        } catch ( e ) {
            error = e;
        }
        callback(error, result);
    } );
    stream.on( 'error', function( error ) {
        callback( error );
    } );
}

function sendTalks( talks, response ) {
    respondJSON( response, 200, {
        serverTime: Date.now(),
        talks: talks
    } );
}

//Next three function are helpers for the updating changed talks
//Uses timeouts
//Same will be done on client for each user
var waiting = [];

function waitForChanges( since, response ) {
    var waiter = {
        since: since,
        response: response
    };
    waiting.push( waiter );
    setTimeout( function() {
        var found = waiting.indexOf( waiter );
        if ( found > -1 ) {
            waiting.splice( found, 1 );
            sendTalks( [], response );
        }
    }, 90 * 1000 );
}

var changes = [];

function registerChange( title ) {
    changes.push( {
        title: title,
        time: Date.now()
    } );
    waiting.forEach( function( waiter ) {
        sendTalks( getChangedTalks( waiter.since), waiter.response);
    } );
    waiting = [];
}

function getChangedTalks( since ) {
    var found = [];

    function alreadySeen( title ) {
        return found.some( function( f ) {
            return f.title == title;
        } );
    }

    for ( var i = changes.length - 1; i >= 0; i-- ) {
        var change = changes[ i ];
        if ( change.time <= since )
            break;
        else if ( alreadySeen( change.title ) )
            continue;
        else if ( change.title in talks )
            found.push( talks[ change.title ] );
        else
            found.push( {
                title: change.title,
                deleted: true
            } );
    }
    return found;
}

var talks = Object.create( null );

//All the routes
//Get appropriate talk
router.add( 'GET', /^\/talks\/([^\/]+)$/ ,
    function( request, response, title ) {
        if ( title in talks ) respondJSON( response, 200, talks[ title ] );
        else respond( response, 404, 'No talk \'' + title + '\' found' );
    } );

//Delete the talk
router.add( 'DELETE', /^\/talks\/([^\/]+)$/ ,
    function( request, response, title ) {
        //Remove from session object
        if ( title in talks ) {
            delete talks[ title ];
        }
        //Remove from DB
        db.remove(title, registerChange);
        respond( response, 204, null );
    });

//Add the talk
router.add( 'PUT', /^\/talks\/([^\/]+)$/,
    function( request, response, title ) {
        readStreamAsJSON( request, function( error, talk ) {
            if ( error ) {
                respond( response, 400, error.toString() );
            } else if ( !talk ||
                typeof talk.presenter != 'string' ||
                typeof talk.summary != 'string' ) {
                respond( response, 400, 'Bad talk data' );
            } else {
                talks[ title ] = {
                    title: title,
                    presenter: talk.presenter,
                    summary: talk.summary,
                    comments: []
                };
                //add to DB
                db.add(talks[ title ], function() {
                    registerChange( title );
                    respond( response, 204, null );
                });
            }
        } );
    } );

//Add a comment to a talk
router.add( 'POST', /^\/talks\/([^\/]+)\/comments$/,
    function( request, response, title ) {
        readStreamAsJSON( request, function( error, comment ) {
            if ( error ) {
                respond( response, 400, error.toString() );
            } else if ( !comment ||
                    typeof comment.author != 'string' ||
                    typeof comment.message != 'string' ) {
                respond( response, 400, 'Bad comment data' );
            } else {
                talks[ title ].comments.push( comment );
                //update with comment
                db.update(title, comment, function() {
                    registerChange( title );
                    respond( response, 204, null );
                });

            }
        } );
    } );

//Get all the talks
router.add("GET", /^\/talks$/, function(request, response) {
    var query = require("url").parse(request.url, true).query;
    if (query.changesSince == null) {
        var list = [];
        for (var title in talks)
            list.push(talks[title]);
        //find all records and send them to a view for rendering
        //If app has already a session object - use it instead of DB call
        if(list.length == 0) db.findAll(response, function(list, response) {

            //Transform list from DB to an object
            talks = list.reduce(function(obj, k) {
                obj[k.title] = k;
                return obj;
            }, {});

            sendTalks(list, response);
        });

    } else {
        var since = Number(query.changesSince);
        if (isNaN(since)) {
            respond(response, 400, "Invalid parameter");
        } else {
            var changed = getChangedTalks(since);
            if (changed.length > 0)
                sendTalks(changed, response);
            else
                waitForChanges(since, response);
        }
    }
    //db.close();
});
