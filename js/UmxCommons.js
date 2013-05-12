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
        event) {
            var listeners = this._listeners;
            var list = listeners[topic];
            if (list) {
                for ( var i = 0; i < list.length; i++) {
                    var slot = list[i];
                    slot.listener.call(slot.context || this, event);
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
                        if (slot.listener === callback
                                && (!context || slot.context === context)) {
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

    umx.Class = Class;
    umx.EventManager = EventManager;

})(this);