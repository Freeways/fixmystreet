/**
* Add a new event to the window.onload
*
* @param function func	The new function to add to the loading
*/
function addLoadEvent(func)
{
	var oldonload = window.onload;
	if (typeof window.onload != 'function') {
		window.onload = func;
	}
	else {
		window.onload = function() {
			oldonload();
			func();
		}
	}
}

$(window).load(function() {
    $('.image__caption, .figcaption, .imageCaption').each(function() {
        $(this).width($(this).find('img').width());
    });
});

$(document).ready(function() {
    
    // Remove no-js class
    $('html').removeClass('no-js');

    // Toggle grid overlay
	$('.grid-master').toggle();

	$(window).keypress(function(e) {

		if (e.keyCode == 103) {
			$('.grid-master').toggle();
		}

	});

    // Enable toggle functionality for the target of the link being clicked
    function toggleTarget(toggleTarget, toggleType, specificWidth, firstRun, resize) {
        
        var toggleTarget = toggleTarget,
            toggleType = toggleType,
            specificWidth = specificWidth, 
            firstRun = firstRun, 
            resize = resize;

        if (specificWidth === 'mobile' && window.matchMedia('(min-width: 480px)').matches && firstRun !== true || 
            specificWidth === 'desktop' && !window.matchMedia('(min-width: 760px)').matches && firstRun !== true) {
            if ($(toggleTarget).hasClass('visually-hidden')) {
                $(toggleTarget).removeClass('visually-hidden');
            }
        }
        else if (!specificWidth && firstRun === true || 
                specificWidth === 'mobile' && !window.matchMedia('(min-width: 480px)').matches || 
                specificWidth === 'desktop' && window.matchMedia('(min-width: 760px)').matches) {
            if(toggleTarget != '#more-services-list'){
                if (!$(toggleTarget).hasClass('visually-hidden')) {
                    alert(toggleTarget);
                    $(toggleTarget).addClass('visually-hidden');
                }
            }
        }

    }

    $('a[data-toggle-button="click"]').each(function() {

        var toggleTargetVar = $(this).attr('href');
        toggleTarget($(this).attr('href'), $(this).data('toggle-type'), $(this).data('width-specific'), true);

        $(this).bind('click touchstart', function(e) {

            e.preventDefault();

            $(this).toggleClass('active');
            $(toggleTargetVar).slideToggle(350);

        });

    });

    // Enable toggle functionality for the target of the link being hovered
    function toggleDataBtn() {
        if (window.matchMedia('(max-width: 320px)').matches) {
        
        } else if (window.matchMedia('(max-width: 568px)').matches) {
            $('a[data-toggle-button="hover"]').each(function() {
    
                var toggleTarget = $(this).data('toggle-target'), 
                    multipleToggles = $(this).parent().parent().data('multiple-toggle-widget'), 
                    toggleNewTitle = $(this).html(), 
                    toggleNewDesc = $(this).data('toggle-content'), 
                    toggleNewLinks = $(this).data('toggle-links'),
                    toggleNewHref = $(this).attr('href'), 
                    toggleNewIcon = $(this).data('icon');
        
                $(this).addClass('icon-' + toggleNewIcon);
            
            });
        } else {
            $('a[data-toggle-button="hover"]').each(function() {
        
                var toggleTarget = $(this).data('toggle-target'), 
                    multipleToggles = $(this).parent().parent().data('multiple-toggle-widget'), 
                    toggleNewTitle = $(this).html(), 
                    toggleNewDesc = $(this).data('toggle-content'), 
                    toggleNewLinks = $(this).data('toggle-links'),
                    toggleNewHref = $(this).attr('href'), 
                    toggleNewIcon = $(this).data('icon');
        
                $(this).addClass('icon-' + toggleNewIcon);
        
                $(this).bind('mouseenter touchenter', function(e) {
        
                    e.preventDefault();
                    if (!$(this).parent().hasClass('active')) {
        
                        $(this).parent().addClass('active');
        
                        if (multipleToggles) {
        
                            $(this).parent().parent().find('.active').removeClass('active');
                            $(this).parent().addClass('active');
        
                            $(toggleTarget).fadeOut(50, function() {
        
                                var classes = $(toggleTarget).attr('class').split(' ');
                                $(classes).each(function(i, item) {
                                    classes[i] = item.indexOf('icon') === -1 ? item : 'icon-' + toggleNewIcon;
                                });
                                $(toggleTarget).attr('class', classes.join(' '));
        
                                $(toggleTarget).addClass('icon-' + toggleNewIcon);
        
                                $(toggleTarget).find('h2').html('<strong>' + toggleNewTitle + '</strong>');
                                $(toggleTarget).find('p').html(toggleNewDesc);
                                $(toggleTarget).find('a').attr('href', toggleNewHref);
                                $(toggleTarget).find('ul').removeClass('visually-hidden').html(toggleNewLinks);
        
                                $(toggleTarget).fadeIn(250);
        
                            });
        
                        }
        
                    }
        
                });
        
            });
        }
    }
    toggleDataBtn();
    
    // Enable (pretend) live search functionality
    $('#live-services-search .field').focus(function() {
        $(this).bind('propertychange keyup input paste', function() {
            if ($(this).val().length > 3) {
                $('#live-services-search').find('.icon-live').addClass('pulse');
                if ($(this).val().substr(0, 4) === 'coun') {
                    $('#live-search-results').show();
                }
                else {
                    $('#live-search-results').hide();
                }
            }
            else {
                $('#live-services-search').find('.icon-live').removeClass('pulse');
                $('#live-search-results').hide();
            }
        });
    });

    // Switch out logo for alternative version on small screens
    function mobileLogo() {
        if (!window.matchMedia('(min-width: 480px)').matches) {
            $('.logo img').attr('src', 'files/css_img/angus-logo.png');
        }
        else {
            $('.logo img').attr('src', 'files/css_img/angus-logo-header.png');
        }
    }
    mobileLogo();

    // Execute functions that rely on screen width for layout
    $(window).resize(function() {

        $('a[data-toggle-button="click"]').each(function() {

            toggleTarget($(this).attr('href'), $(this).data('toggle-type'), $(this).data('width-specific'), -1, true);

        });

        mobileLogo();
        toggleDataBtn();
    });
    
    // Remove empty class attributes from all elements that have them
    $('*[class=""]').removeAttr('class');
    
    // Add tab focus from scip to links
    $("a#skipNav").click(function() {
		$("#site-navigation").focus();
    });
    $("a#skipContent").click(function() {
		$("#main-content").focus();
    });
    
});