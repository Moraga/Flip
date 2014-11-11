/**
 * Audience
 *
 * Usage:
 * instance.hit('pageview|main-menu|...');
 *
 * Redefine:
 * instance.hit.clickuol = function() {...}
 * instance.hit.omniture = function() {...}
 *
 * @return object
 */
Flip.Pages.components.audience = function(flip) {
	this.flip = flip;
	
	// shortcut
	flip.audience = this;
	
	/**
	 * Calls all hit functions
	 * @return void
	 */
	flip.hit = function() {
		for (var fn in flip.hit)
			flip.hit[fn].apply(flip, arguments);
	};
	
	// default counting
	
	/**
	 * Click UOL
	 * @param string type Audience count type
	 * @return bool
	 */
	flip.hit.clickuol = function(type) {
		$(document.createElement('img'))
			.appendTo(document.body)
			.attr('src', '//click.uol.com.br/?rf='+ this.page.name +'&u=http://h.imguol.com/x.gif?'+ type).
			on('load', function() {
				$(this).remove();
			});
		return true;
	};
	
	/**
	 * Ominiture
	 * @param string type Audience count type
	 * @return bool
	 */
	flip.hit.omniture = function(type) {
		// pageview
		if (type == 'pageview') {
			if (typeof hitOmniture != 'undefined') {
				hitOmniture(type, this.page.name);
				return true;
			}
		}
		// event
		else if (typeof omtrClick != 'undefined') {
			omtrClick(type, this.page.name);
			return true;
		}
		
		return false;
	};
};

/**
 * Flip form component
 * @return object
 */
Flip.Page.components.form = function(page) {
	this.page = page;
	
	Flip.tools.composite.event(this);
	
	// shortcut
	page.form = this;
};

Flip.Page.components.form.prototype = {
	/**
	 * Gets a form input value
	 * @param string selector Optional selector
	 * @return string
	 */
	val: function(selector) {
		return this.dom.filter(selector || '*').data('value');
	},
	
	/**
	 * Init
	 * @return void
	 */
	init: function() {
		this.dom = $('.buttons, .checkbox, .radio, .select', this.page.dom).each(function() {
			var elem = $(this);
			
			// creates the structure from text
			if (elem.find('ul').length == 0) {
				var opts = elem.text().replace(/^\s+/, '').replace(/\s+$/, '').split(/\s*[\n,]+\s*/),
					html = '',
					regx = /([^\(]+)(?:\(([^\)]+)\))?/,
					i = 0;
				
				for (; i < opts.length; i++) {
					opts[i] = regx.exec(opts[i]).slice(1, 3);
					// key and value are equals
					if (opts[i][1] === undefined)
						opts[i][1] = opts[i][0];
					html += '<li data-value="'+ opts[i][1] +'">'+ opts[i][0] +'</li>';
				}
				
				elem.html('<ul>'+ html +'</ul>');
			}
			
			$('li', elem).on('click', function() {
				
			});
		});
	}
};

// Menu interaction
(function() {
	var menu = $('.menu'),
		tout = 800,
		visb = false,
		show = function() {
			if (timr)
				stop();
			menu.addClass('active');
			visb = true;
		},
		hide = function() {
			menu.removeClass('active');
			visb = false;
		},
		togg = function() {
			visb ? hide() : show();
		},
		leav = function() {
			timr = setTimeout(hide, tout);
		},
		stop = function() {
			timr = clearTimeout(timr);
		},
		timr;

	menu.on({click: togg, mouseenter: show, mouseleave: leav});
})();

// Submenu interaction
(function() {
	var cale = $('.navbar-center a'),
		tout = 800,
		body = $(document.body),
		stat = cale.hasClass('active'),
		subm = $('.submenu'),
		subn = false,
		show = function() {
			// prevents default when
			if (body.hasClass('capa'))
				return;
			cler();
			prev();
			cale.addClass('active');
			subm.animate({top: 50});
			stat = true;
		},
		hide = function() {
			// prevents default when
			if (body.hasClass('capa'))
				return;
			cale.removeClass('active');
			subm.animate({top: subm.outerHeight() * -1});
			stat = false;
		},
		togg = function() {
			lock || stat ? hide() : show();
		},
		cler = function() {
			timr = clearTimeout(timr);
		},
		leav = function() {
			timr = setTimeout(hide, tout);
		},
		prev = function() {
			lock = true;
			setTimeout(function() {
				lock = false;
			}, tout);
		},
		lock = false,
		timr;
	
	cale.on({click: togg, mouseenter: show, mouseleave: leav});
	subm.on({mouseenter: cler, mouseleave: leav});
})();