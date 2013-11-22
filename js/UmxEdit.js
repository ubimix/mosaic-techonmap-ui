(function(context) {
    function trim(str) {
        if (!str)
            return '';
        str = str + '';
        return str.replace(/^\s+|\s+$/g, '');
    }
    var ValueTracker = context.ValueTracker = new umx.Class();
    ValueTracker.extend(umx.EventManager);
    ValueTracker.include({
        init : function(e, options) {
            this.options = options || {
                validate : true
            };
            umx.EventManager.prototype.init.call(this);
            this.element = jQuery(e);
            var that = this;
            this.on('reset', function(e) {
                that.prevValue = e.value;
            }, that);
            var validateValue = function(e) {
                that._notifyChanges();
            }
            this.element.focus(validateValue);
            this.element.blur(validateValue);
            this.element.on('input', validateValue);
            // this.element.change(validateValue);
            // this.element.keydown(validateValue);
            // this.element.keyup(validateValue);
            this.element.keypress(function(e) {
                validateValue();
                if (e.keyCode == 13) {
                    console.log('Enter was pressed!')
                    e.preventDefault();
                    return false;
                }
            });
            this.reset();

            if (this.options.validate) {
                this.on('changed', function() {
                    this.validate();
                }, this);
            }
        },
        _notifyChanges : function() {
            var newValue = this.getValue();
            if (newValue != this.prevNotified) {
                this.fire('changed', {
                    oldValue : this.prevValue,
                    value : newValue
                });
                this.prevNotified = newValue;
            }
        },
        getValue : function() {
            return trim(this.element.val());
        },
        setValue : function(value, notify) {
            value = trim(value);
            this.element.val(value);
            if (notify) {
                this._notifyChanges();
            }
        },
        isRequired : function() {
            var required = this.element.data('required');
            if (required === undefined)
                return false;
            return required ? true : false;
        },
        validate : function() {
            var result = !this.options.validate || !this.element.parsley
                    || this.element.parsley('validate');
            return result;
        },
        reset : function() {
            this.prevValue = this.getValue();
            delete this.prevNotified;
            this.fire('reset', {
                value : this.prevValue
            });
        }
    });

})(this);