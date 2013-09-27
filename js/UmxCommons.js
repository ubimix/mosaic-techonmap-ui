'use strict';
(function(context) {
    var umx = context.umx = context.umx || {};

    /* ====================================================================== */
    /** A common super-class. */
    var Class = function() {
        var NewType = function() {
            this.init.apply(this, arguments);
        };
        NewType.fn = NewType.prototype;
        NewType.fn.parent = NewType;
        NewType.fn.init = function() {
        };
        function copy(from, to) {
            for ( var i in from) {
                if (from.hasOwnProperty(i)) {
                    to[i] = from[i];
                }
            }
        }
        NewType.fn.setOptions = function(options) {
            this.options = this.options || {};
            copy(options, this.options);
        }
        NewType.include = function(obj) {
            copy(obj, NewType.fn);
        };
        NewType.extend = function() {
            for ( var i = 0; i < arguments.length; i++) {
                var obj = arguments[i];
                // Extends static fields and methods
                for ( var i in obj) {
                    if (obj.hasOwnProperty(i) && !NewType.hasOwnProperty(i)) {
                        NewType[i] = obj[i];
                    }
                }
                // Extend prototype properties
                NewType.include(obj.fn);
            }
        };
        return NewType;
    };

    /* ====================================================================== */
    /** An event manager */
    var EventManager = new Class();
    EventManager.include({

        init : function() {
            this._listeners = {};
        },

        /** Adds a new listener for the specified topic. */
        addListener : function(/* String */topic, /* Function */
        callback, /* Object */context) {
            var listeners = this._listeners;
            if (!listeners[topic]) {
                listeners[topic] = [];
            }
            listeners[topic].push({
                context : context || this,
                listener : callback
            });
            var that = this;
            return {
                unsubscribe : function() {
                    that.removeListener(topic, callback, context);
                }
            }
        },

        /** Adds a new listener for the specified topic. */
        fireEvent : function(/* String */topic, /* Object */
        event, /* Function - optional */callback, /* Object - optional */
        callbackContext) {
            var item = {
                topic : topic,
                event : event,
                callback : callback,
                callbackContext : callbackContext,
            }
            if (!this._queue) {
                this._queue = item;
                this._top = item;
            } else {
                this._top.next = item;
            }
            if (!this._running) {
                this._running = true;
                try {
                    var listeners = this._listeners;
                    while (this._queue) {
                        var top = this._queue;
                        this._queue = top.next;
                        var list = listeners[top.topic];
                        if (list) {
                            for ( var i = 0; i < list.length; i++) {
                                var slot = list[i];
                                slot.listener.call(slot.context || this, top.event);
                            }
                        }
                        if (top.callback) {
                            top.callback.call(top.callbackContext || top.callback, top.event);
                        }
                    }
                } finally {
                    this._running = false;
                }
            }
        },

        /**
         * Removes the specified topic listener. If the listener is not
         * specified then all listeners are removed.
         */
        removeListener : function(/* String */topic, /* Function */
        callback, /* Object */context) {
            var listeners = this._listeners;
            if (listeners[topic]) {
                if (!callback) {
                    delete listeners[topic];
                } else {
                    var list = listeners[topic];
                    var len = list.length;
                    context = context || this;
                    while (len--) {
                        var slot = list[len];
                        if (slot.listener === callback && (!context || slot.context === context)) {
                            list.splice(len, 1);
                        }
                    }
                    if (!list.length) {
                        delete listeners[topic];
                    }
                }
            }
        }
    });

    EventManager.prototype.on = EventManager.prototype.addListener;
    EventManager.prototype.off = EventManager.prototype.removeListener;
    EventManager.prototype.fire = EventManager.prototype.fireEvent;

    /* ====================================================================== */
    /** A simple poll-based tracker of URL hashes */
    var HashTracker = new Class();
    HashTracker.extend(EventManager);
    HashTracker.include({
        start : function() {
            var that = this;
            var timeout = this.getTimeout();
            that.id = setInterval(function() {
                that._checkHash();
            }, timeout);
            that._checkHash();
            this.fire('hash:started', {});
        },
        stop : function() {
            this.fire('hash:stopped', {});
        },
        getTimeout : function() {
            return 100;
        },
        getHash : function() {
            if (!context.location || !context.location.hash)
                return '';
            return context.location.hash + '';
        },
        setHash : function(hash) {
            if (!context.location)
                return;
            context.location.hash = hash;
        },
        _checkHash : function() {
            var hash = this.getHash();
            if (hash != this._hash) {
                this.fire('hash:changed', {
                    hash : hash,
                    prev : this._hash
                });
                this._hash = hash;
            }
        }
    });

    /* ====================================================================== */
    /** Utility methods and services */
    /* ------------------------------------------------------------------ */

    /**
     * This class is used to delay execution of an action - it executes only the
     * last operation fired in a specific period of time. This class is useful
     * to avoid frequent calls for long-running ("cost") operations. For example
     * it could be used to show additional information when mouse is over a
     * link.
     */
    var DelayedAction = new Class();
    DelayedAction.extend(EventManager);
    DelayedAction.include({

        /** Sets minimal timeout between two executions. */
        init : function(timeout) {
            this.timerId = null;
            this.timeout = timeout || 100;
        },
        /**
         * Returns the timeout (lag) between two calls.
         */
        getTimeout : function() {
            return this.timeout;
        },

        /**
         * Runs a new action. The first parameter of this method is the function
         * to call. All other parameters are used as arguments for the function.
         * 
         * @param method
         *            delayed method to launch
         * @param object
         *            the object set as a "this" for the method
         * @param parameters
         *            arguments of the method to launch
         */
        run : function(/* Function */method /* , Arguments */) {
            this.stop();
            if (arguments.length > 0) {
                var action = arguments[0]
                var that = arguments[1] || this;
                var args = [];
                for ( var i = 2; i < arguments.length; i++) {
                    args.push(arguments[i]);
                }
                this.timerId = setTimeout(function() {
                    action.apply(this, args);
                    that.timerId = null;
                }, this.getTimeout());
            }
        },

        /**
         * Interrupts the action execution.
         */
        stop : function() {
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
        }

    });

    /* ====================================================================== */

    umx.Class = Class;
    umx.EventManager = EventManager;
    umx.HashTracker = HashTracker;
    umx.DelayedAction = DelayedAction;

})(this);