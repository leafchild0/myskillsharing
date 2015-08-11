var Router = module.exports = function () {
    this.routes = [];
};

//Add any routes in the router object
Router.prototype.add = function(method, url, handler) {
    this.routes.push({method: method,
        url: url,
        handler: handler});
};

//Resolving all the requests
Router.prototype.resolve = function(request, response) {
    var path = require('url').parse(request.url).pathname;

    return this.routes.some(function(route) {
        var match = route.url.exec(path);
        if(!match || route.method != request.method)
            return false;

        var urlParts = match.slice(1).map(decodeURIComponent);
        route.handler.apply(null, [request, response].concat(urlParts));

        return true;

    });
};