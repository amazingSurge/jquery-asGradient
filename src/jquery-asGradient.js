/*
 * jquery-asGradient
 * https://github.com/amazingSurge/jquery-asGradient
 *
 * Copyright (c) 2014 amazingSurge
 * Licensed under the GPL license.
 */
(function(window, document, $, Color, undefined) {
    'use strict';

    function flip(o) {
        var flipped = {};
        for (var i in o) {
            if (o.hasOwnProperty(i)) {
                flipped[o[i]] = i;
            }
        }
        return flipped;
    }

    function isPercentage(n) {
        return typeof n === "string" && n.indexOf('%') != -1;
    }

    function reverseDirection(direction){
        var mapping = {
            'top'          : 'bottom',
            'right'        : 'left',
            'bottom'       : 'top',
            'left'         : 'right',
            'right top'    : 'left bottom',
            'top right'    : 'bottom left',
            'bottom right' : 'top left',
            'right bottom' : 'left top',
            'left bottom'  : 'right top',
            'bottom left'  : 'top right',
            'top left'     : 'bottom right',
            'left top'     : 'right bottom',
        };
        return mapping.hasOwnProperty(direction)?mapping[direction]: direction;
    }
    var RegExpStrings = (function(){
        var color = /(?:rgba|rgb|hsla|hsl)\s*\([\s\d\.,%]+\)|#[a-z0-9]{3,6}|[a-z]+/i,
            position = /\d{1,3}%/i,
            angle = /(?:to ){0,1}(?:(?:top|left|right|bottom)\s*){1,2}|\d+deg/i,
            stop = new RegExp('(' + color.source + ')\\s*(' + position.source + '){0,1}', 'i'),
            stops = new RegExp(stop.source, 'gi'),
            parameters = new RegExp('(?:('+ angle.source +'),){0,1}\\s*(.+)\\s*', 'i');

        return {
            FULL: /(-webkit-|-moz-|-ms-|-o-){0,1}(linear|radial|repeating-linear)-gradient\s*\(\s*(.+)\s*\)/i,
            ANGLE: angle,
            COLOR: color,
            POSITION: position,
            STOP: stop,
            STOPS: stops,
            PARAMETERS: parameters
        };
    })(),
    GradientTypes = {
        LINEAR: {
            parse: function(result) {
                return {
                    r: (result[1].substr(-1) === '%') ? parseInt(result[1].slice(0, -1) * 2.55, 10) : parseInt(result[1], 10),
                    g: (result[2].substr(-1) === '%') ? parseInt(result[2].slice(0, -1) * 2.55, 10) : parseInt(result[2], 10),
                    b: (result[3].substr(-1) === '%') ? parseInt(result[3].slice(0, -1) * 2.55, 10) : parseInt(result[3], 10),
                    a: 1
                };
            },
            to: function(gradient, instance, prefix) {
                if(gradient.stops.length === 0){
                    return instance.options.emptyString;
                }
                if(gradient.stops.length === 1){
                    return gradient.stops[0].color.to(instance.options.degradationFormat);
                }

                var standard = instance.options.forceStandard, _prefix = instance._prefix;
                if(!_prefix) {
                    standard = true;
                }
                if(prefix && -1 !== $.inArray(prefix, instance.options.prefixes)) {
                    standard = false;
                    _prefix = prefix;
                }
                var angle = Gradient.formatAngle(gradient.angle, instance.options.angleUseKeyword, standard);
                var stops = Gradient.formatStops(gradient.stops, instance.options.cleanPosition);

                var output = 'linear-gradient(' + angle + ', ' + stops + ')';
                if(standard) {
                    return output;
                } else {
                    return _prefix + output;
                }
            }
        }
    };

    var Gradient = $.asGradient = function(string, options) {
        if (typeof string === 'object' && typeof options === 'undefined') {
            options = string;
            string = undefined;
        }
        this.value = {
            angle: 0,
            stops: []
        };
        this.options = $.extend(true, {}, Gradient.defaults, options);

        this._type = 'LINEAR';
        this._prefix = null;
        this.length = this.value.stops.length;
        this.current = 0;

        this.init(string);
    };

    Gradient.prototype = {
        constructor: Gradient,
        init: function(string) {
            if(string){
                this.fromString(string);
            }
        },
        val: function(value) {
            if (typeof value === 'undefined') {
                return this.toString();
            } else {
                this.fromString(value);
                return this;
            }
        },
        angle: function(value) {
            if (typeof value === 'undefined') {
                return this.value.angle;
            } else {
                this.value.angle = Gradient.parseAngle(value);
            }
        },
        append: function(color, position){
            this.insert(color, position, this.length);
        },
        insert: function(color, position, index) {
            if(typeof index === 'undefined') {
                index = this.current;
            }
            var format;
            if(this.options.forceColorFormat){
                format = this.options.forceColorFormat;
            }
            var stop = {
                color: new Color(color, format, this.options.color),
                position: Gradient.parsePosition(position)
            };
            
            this.value.stops.splice(index, 0, stop);
            
            this.length = this.length + 1;
            this.current = index;

        },
        get: function(index) {
            if(typeof index === 'undefined') {
                index = this.current;
            }
            if(index >= 0 && index < this.length) {
                this.current = index;
                return this.value.stops[index];
            } else {
                return false;
            }
        },
        remove: function(index) {
            if(typeof index === 'undefined') {
                index = this.current;
            }
            if(index >= 0 && index < this.length) {
                this.value.stops.splice(index, 1);
                this.length = this.length - 1;
                this.current = index - 1;
            }
        },
        empty: function() {
            this.value.stops = [];
            this.length = 0;
            this.current = 0;
        },
        reset: function() {
            this.angle(0);
            this.empty();
            this._prefix = null;
            this._type = 'LINEAR';
        },
        type: function(type) {
            if (typeof type === 'string' && (type = type.toUpperCase()) && typeof GradientTypes[type] !== 'undefined') {
                this._type = type;
            } else {
                return this._type;
            }
        },
        fromString: function(string) {
            this.reset();

            var result = Gradient.parseString(string);
            if(result) {
                this._prefix = result.prefix;
                this.type(result.type);
                if(result.value){
                    this.angle(result.value.angle);
                    var self = this;
                    $.each(result.value.stops, function(i, stop) {
                        self.append(stop.color, stop.position);
                    });
                }
            }
        },
        toString: function(prefix) {
            return GradientTypes[this.type()].to(this.value, this, prefix);
        },
        getPrefixedStrings: function() {
            var strings = [];
            for(var i in this.options.prefixes){
                strings.push(this.toString(this.options.prefixes[i]));
            }
            return strings;
        }
    };
    Gradient.parseString = function(string) {
        var matched, parameters;
        if ((matched = RegExpStrings.FULL.exec(string)) != null) {
            return {
                prefix: (typeof matched[1] === 'undefined') ? null: matched[1],
                type: matched[2],
                value: Gradient.parseParameters(matched[3])
            };
        } else {
            return false;
        }
    };
    Gradient.parseParameters = function(string) {
        var matched;
        if ((matched = RegExpStrings.PARAMETERS.exec(string)) != null) {
            return {
                angle: (typeof matched[1] === 'undefined') ? 0: matched[1],
                stops: Gradient.parseStops(matched[2])
            };
        } else {
            return false;
        }
    };
    Gradient.parseStops = function(string) {
        var matched, result = [];
        if ((matched = string.match(RegExpStrings.STOPS)) != null) {
            
            $.each(matched, function(i, item){
                var stop = Gradient.parseStop(item);
                if(stop) {
                    result.push(stop);
                }
            });
            return result;
        } else {
            return false;
        }
    };
    Gradient.formatStops = function(stops, cleanPosition){
        var stop, output = [], positions = [], colors = [], position;

        for(var i = 0; i < stops.length; i++){
            stop = stops[i];
            if(typeof stop.position === 'undefined'){
                if(i === 0){
                    position = 0;
                } else if(i === stops.length - 1){
                    position = 1;
                } else {
                    twice = true;
                }
            } else {
                position = stop.position;
            }
            positions.push(position);
            colors.push(stop.color.toString());
        }

        positions = (function(data){
            var start = null, average; 
            for(var i = 0; i < data.length; i++){
                if(isNaN(data[i])){
                  if(start === null){
                    start = i;
                    continue;
                  }
                }else if(start){
                  average = (data[i]-data[start-1])/(i-start+1);
                  for(var j = start;j < i;j++){
                     data[j] = data[start-1]+(j-start+1)*average;
                  }
                  start = null;
                }
            }
            
            return data;
        })(positions);

        for(var i = 0; i < stops.length; i++){
            if( cleanPosition && ((i === 0 && positions[i] === 0) || (i === stops.length -1 && positions[i] === 1)) ){
                position = '';
            } else {
                position = ' ' + Gradient.formatPosition(positions[i]);
            }
            
            output.push(colors[i] + position);
        }
        return output.join(', ');
    };
    Gradient.parseStop = function(string) {
        var matched;
        if ((matched = RegExpStrings.STOP.exec(string)) != null) {
            var position;
            
            return {
                color: matched[1],
                position: Gradient.parsePosition(matched[2])
            };
        } else {
            return false;
        }
    };
    Gradient.parsePosition = function(string) {
        if(typeof string === 'string' && string.substr(-1) === '%'){
            string = parseFloat(string.slice(0, -1) / 100);
        }

        return string;
    };
    Gradient.formatPosition = function(value){
        return parseInt(value * 100, 10) + '%';
    };
    Gradient.parseAngle = function(string) {
        if(typeof string === 'string'){
            if(string.indexOf("to ") === 0){
                string = $.trim(string.substr(3));
                string = reverseDirection(string);
            }
            if(Gradient.keywordAngleMap.hasOwnProperty(string)){
                string = Gradient.keywordAngleMap[string];
            }
        }

        var value = parseInt(string, 10);

        if (value > 360) {
            value = value % 360;
        } else if (value < 0) {
            value = value % -360;

            if(value !== 0) {
                value = 360 + value;
            }
        }
        return value;
    };
    Gradient.formatAngle = function(value, useKeyword, standard){
        value = parseInt(value, 10);
        if(useKeyword && Gradient.angleKeywordMap.hasOwnProperty(value)){
            value = Gradient.angleKeywordMap[value];
            if(standard){
                value = 'to ' + reverseDirection(value);
            }
        } else {
            value = value + 'deg';
        }

        return value;
    };
    Gradient.defaults = {
        prefixes: ['-webkit-','-moz-','-ms-','-o-'],
        forceStandard: true,
        angleUseKeyword: true,
        emptyString: '',
        degradationFormat: false,
        cleanPosition: true,
        forceColorFormat: false, // rgb, rgba, hsl, hsla, hex
        color: {
            hexUseName: false,
            reduceAlpha: true,
            shortenHex: true,
            zeroAlphaAsTransparent: false,
            invalidValue: {
                r: 0,
                g: 0,
                b: 0,
                a: 1
            }
        }
    };
    Gradient.keywordAngleMap = {
        'top'          : 0,
        'right'        : 90,
        'bottom'       : 180,
        'left'         : 270,
        'right top'    : 45,
        'top right'    : 45,
        'bottom right' : 135,
        'right bottom' : 135,
        'left bottom'  : 225,
        'bottom left'  : 225,
        'top left'     : 315,
        'left top'     : 315,
    };
    Gradient.angleKeywordMap = flip(Gradient.keywordAngleMap);
}(window, document, jQuery, (function($) {
    if ($.asColor === undefined) {
        // console.info('lost dependency lib of $.asColor , please load it first !');
        return false;
    } else {
        return $.asColor;
    }
}(jQuery))));
