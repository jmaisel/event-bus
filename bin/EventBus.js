var winston = require('winston');

/**
 * Emitter which supports subscription by regular 
 * expressions compared against the event namespace.
 */
exports.EventBus = new function(){
	
	// Cache of event names to listeners as 
	// discovered during event notification
	var cache = {};
	
	// Listener functions
	var listeners = [];
	
	// logger
	var lager = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({colorize:true, prettyPrint: true, timestamp: true})
			//,new (winston.transports.File)({ filename: 'somefile.log' })
			]
		});
	
	// This should be part of the standard Array object in Javascript!
	// This function via John Ressig; MIT License.
	listeners.remove = function(from, to) {
	  var rest = this.slice((to || from) + 1 || this.length);
	  this.length = from < 0 ? this.length + from : from;
	  return this.push.apply(this, rest);
	};
	
	// Cache the binding of a listener to 
	// an event namespace
	function cacheBinding(expr, listener){
		if(!cache[expr]){
			cache[expr] = [];
		}

		cache[expr].push(listener);
	}	
	
	//- public signature
	var that = {
		
		/**
		 * Bind a listener function to a regex.  When an
		 * event is fired whose name matches the regex, 
		 * the listener function is called.
		 */
		bind : function(expr, listener){
			listener.expr = expr;
			listeners.push(listener);
			
			// Add to cache if cache initialized
			for( var ns in cache ){
				var regex = new RegExp(listener.expr);
				if( regex.test(ns) ){
					cacheBinding(ns, listener);
				}
			}
		},
		
		/**
		 * Flush the cached mapping of an expression to an 
		 * array of listeners.
		 */
		flush: function(expr){
			
			for( var i=0; i<cache[expr].length; i++){
				listeners.remove(i);
			}
			delete cache[expr];
		},
		
		/**
		 * Fire an event.
		 */
		fire : function(expr, evt){
			
			var cached = cache[expr];
			var matched = false;
			evt.src = arguments.callee.caller.toString().replace("\n|\t", "").split(")")[0] + ")";
			evt.timestamp = new Date().getTime();
						
			// handle cached
			if( cached ){
				
				lager.info( "executing cached listeners for", expr );
				
				for( var i=0; i<cached.length; i++){
					var listener = cached[i];
					var vetoed = listener(expr, listener.expr, evt);
					matched = true;
					
					if( vetoed == false ){
						lager.warn("Notifications vetoed. Listener ", listener, " returned false")
						break;
					}
				}
			}
			// handle uncached
			else{
				
				lager.info( "looking for listeners subscribed to", expr );
				
				for( var i=0; i<listeners.length; i++ ){
				
					var listener = listeners[i];
					var lexpr = listener.expr;
					var regex = new RegExp(lexpr);
				
					if( regex.test(expr) ){
						var vetoed = listener(expr, lexpr, evt);
						
						listener.idx = i;
						cacheBinding(expr, listener);
						matched = true;
						
						if( vetoed == false ){
							lager.warn("Notifications vetoed. Listener ", listener, " returned false")
							break;
						}
					}
				}
			}
			
			if(!matched)
				lager.warn("No listeners found for event", expr);
		}
	};
	
	return that;
}

