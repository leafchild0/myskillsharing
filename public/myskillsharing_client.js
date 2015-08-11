//Main function which handles ajax requests to the server
function request( options, callback ) {
    var r = new XMLHttpRequest();
    r.open( options.method || 'GET', options.pathname, true );
    r.addEventListener( 'load', function() {
        if ( r.status < 400 )
            callback( null, r.responseText );
        else
            callback( new Error( 'Request failed:' + r.statusText ) );
    } );
    r.addEventListener( 'error', function() {
        callback( new Error( 'Network error' ) );
    } );
    r.send( options.body || null );
}

function reportError( error ) {
    if ( error )
        alert( error.toString() );
}

//Display all the talk on the first attempt
function displayTalks( talks ) {
    talks.forEach( function( talk ) {
        var shown = showTalks[ talk.title ];
        if ( talk.deleted ) {
            if ( shown ) {
                talkDiv.removeChild( shown );
                delete showTalks[ talk.title ];
            }
        } else {
            var node = drawTalk( talk );
            if ( shown )
                talkDiv.replaceChild( node, shown );
            else
                talkDiv.appendChild( node );
            showTalks[ talk.title ] = node;
        }
    } );
}

//Template initialization
function instantiateTemplate( name, values ) {
    function instantiateText( text ) {
        return text.replace( /\{\{(\w+)\}\}/g, function( _, name ) {
            return values[ name ];
        } );
    }

    function instantiate( node ) {
        if ( node.nodeType === document.ELEMENT_NODE ) {
            var copy = node.cloneNode();
            for ( var i = 0; i < node.childNodes.length; i++ ) {
                copy.appendChild( instantiate( node.childNodes[ i ] ) );
            }
            return copy;
        } else if ( node.nodeType === document.TEXT_NODE ) {
            return document.createTextNode( instantiateText( node.nodeValue ) );
        } else
            return node;
    }

    var template = document.querySelector( '#template .' + name );
    return instantiate( template );
}

//Draw each talk separately
//Updates the talk
function drawTalk( talk ) {
    var node = instantiateTemplate( 'talk', talk );
    var comments = node.querySelector( '.comments' );
    talk.comments.forEach( function( comment ) {
        comments.appendChild( instantiateTemplate( 'comment', comment ) );
    } );

    node.querySelector( 'button.del' ).addEventListener( 'click', deleteTalk.bind( null, talk.title ) );

    var form = node.querySelector( 'form' );
    form.addEventListener( 'submit', function( event ) {
        event.preventDefault();
        addComment( talk.title, form.elements.comment.value );
        form.reset();
    } );
    return node;
}

function talkUrl( title ) {
    return 'talks/' + encodeURIComponent( title );
}

function deleteTalk( title ) {
    request( {
        id: talkUrl( title ),
        pathname: talkUrl( title ),
        method: 'DELETE'
    }, reportError );
}

function addComment( title, reqComment ) {
    var comment = {
        author: nameField.value,
        message: reqComment
    };
    request( {
            id: talkUrl( title ),
            pathname: talkUrl( title ) + '/comments',
            body: JSON.stringify( comment ),
            method: 'POST'
        },
        reportError );
}

//Always waits for changes
function waitForChanges() {
    request( {
            pathname: 'talks?changedSince=' + lastServerTime
        },
        function( error, response ) {
            if ( error ) {
                setTimeout( waitForChanges, 2500 );
                console.log( error.stack );
            } else {
                response = JSON.parse( response );
                displayTalks( response.talks );
                lastServerTime = response.serverTime;
                waitForChanges();
            }
        } );
}

var talkDiv = document.querySelector( '#talks' );
var showTalks = Object.create( null );

var lastServerTime = 0;

request( {
    pathname: 'talks'
}, function( error, response ) {
    if ( error ) {
        reportError( error );
    } else {
        response = JSON.parse( response );
        displayTalks( response.talks );
        lastServerTime = response.serverTime;
        waitForChanges();
    }
} );

var nameField = document.querySelector( '#name' );
nameField.value = localStorage.getItem( 'name' ) || '';
var talkForm = document.querySelector( '#newtalk' );

//Storing value on the local storage
nameField.addEventListener( 'change', function() {
    localStorage.setItem( 'name', nameField.value );
} );

talkForm.addEventListener( 'submit', function( event ) {
    event.preventDefault();
    request( {
        id: talkUrl( talkForm.elements.title.value ),
        pathname: talkUrl( talkForm.elements.title.value ),
        method: 'PUT',
        body: JSON.stringify( {
            presenter: nameField.value,
            summary: talkForm.elements.summary.value
        } )
    }, reportError );
    talkForm.reset();
} );