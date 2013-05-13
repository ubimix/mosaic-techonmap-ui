(function(context) {
    context.LeafIcon = L.Icon.extend({
        options : {
            iconSize : [ 33, 40 ],
            shadowSize : [ 0, 0 ],
            iconAnchor : [ 17, 40 ],
            shadowAnchor : [ 0, 0 ],
            popupAnchor : [ 0, -50 ]
        }
    });
    context.CategoryInfo = CategoryInfo;
    context.scrollIntoView = scrollIntoView;

    /**
     * This method is used to move the specified element in view in a scrollable
     * container.
     * 
     * @see http://stackoverflow.com/questions/1805808/how-do-i-scroll-a-row-of-a-table-into-view-element-scrollintoview-using-jquery
     */
    function scrollIntoView($element, $scroller, delta) {
        delta = delta || 0;
        $scroller.scrollTop($element.position().top - delta);
    }

    /**
     * This calss is used to manage point categories - their names, keys and
     * associated visual attributes (like icons) etc
     */
    function CategoryInfo(categories) {
        this.categories = categories;
        this.defaultKey = null;
        this.icons = {};
        for ( var key in this.categories) {
            if (!this.categories.hasOwnProperty(key))
                continue;
            this.defaultKey = key;
            break;
        }
    }
    CategoryInfo.prototype.getCategoryInfo = function(category) {
        var t = this.categories[category];
        if (!t) {
            t = this.categories[this.defaultKey];
        }
        return t;
    }
    CategoryInfo.prototype.getPicto = function(category) {
        var categoryInfo = this.getCategoryInfo(category);
        return categoryInfo.pictoClass;
    }
    CategoryInfo.prototype.setPictoClass = function(element, category) {
        if (!this.pictoList) {
            this.pictoList = [];
            for ( var key in this.categories) {
                var categoryInfo = this.categories[key];
                var picto = categoryInfo.pictoClass;
                this.pictoList.push(picto);
            }
        }
        element = $(element);
        for ( var i = 0; i < this.pictoList.length; i++) {
            var picto = this.pictoList[i];
            element.removeClass(picto);
        }
        var categoryInfo = this.getCategoryInfo(category);
        var picto = categoryInfo.pictoClass;
        element.addClass(picto);
    }
    CategoryInfo.prototype.getMapIcon = function(category, on) {
        var info = this.getCategoryInfo(category);
        var key = (on ? 'iconOn' : 'iconOff');
        var iconKey = category + "_" + key;
        var icon = this.icons[iconKey];
        if (!icon) {
            icon = this.icons[iconKey] = new LeafIcon({
                iconUrl : info[key]
            })
        }
        return icon;
    }
    CategoryInfo.prototype.getCategoryName = function(category) {
        var info = this.getCategoryInfo(category);
        return info.name;
    }

})(this);