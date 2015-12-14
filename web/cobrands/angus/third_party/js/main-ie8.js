// Let's get that CSS3 working in IE, shall we?
function yieldedAddClass(selector, className, yieldTime) {
    setTimeout(function() {
        $(selector).addClass(className);
    }, yieldTime);
}
function addClassesToElements(elementsClassesArray, yieldTime) {
    $.each(elementsClassesArray, function(index, selectorClassKVP) {
        yieldedAddClass(selectorClassKVP.selector, selectorClassKVP.className, yieldTime);
    });
};
    
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
                    $(toggleTarget).addClass('visually-hidden');
                }
            }
        }

    }

    $('a[data-toggle-button="click"]').each(function() {

        var toggleTargetVar = $(this).attr('href');
        toggleTarget($(this).attr('href'), $(this).attr('data-toggle-type'), $(this).attr('data-width-specific'), true);

        $(this).bind('click touchstart', function(e) {

            e.preventDefault();

            $(this).toggleClass('active');
            $(toggleTargetVar).slideToggle(350);

        });

    });

    // Enable toggle functionality for the target of the link being hovered
    $('a[data-toggle-button="hover"]').each(function() {

        var toggleTarget = $(this).data('toggle-target'), 
            multipleToggles = $(this).parent().parent().attr('data-multiple-toggle-widget'), 
            toggleNewTitle = $(this).html(), 
            toggleNewDesc = $(this).attr('data-toggle-content'), 
            toggleNewLinks = $(this).attr('data-toggle-links'), 
            toggleNewHref = $(this).attr('href'), 
            toggleNewIcon = $(this).attr('data-icon');

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

    // Enable live search field
    $('#live-services-search .field').removeAttr('disabled').removeClass('field__disabled');
    
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


    // Execute functions that rely on screen width for layout
    $(window).resize(function() {

        $('a[data-toggle-button="click"]').each(function() {

            toggleTarget($(this).attr('href'), $(this).attr('data-toggle-type'), $(this).attr('data-width-specific'), -1, true);

        });

    });
    
    // Remove empty class attributes from all elements that have them
    $('*[class=""]').removeAttr('class');
    
    // Make magic happen, with very little bloat :)
    addClassesToElements([
        {
            selector: '.home .widget-row:first-child, .site-footer .footer-copy .container .tel span:first-child',
            className: 'ie-first-child'
        },
        {
            selector: '.home .widget-row:last-child, .widget__featured-services li:last-child, .widget__latest-news a:last-child, .widget__middle-adverts .advert:last-child, .widget-style__2:last-child, .site-footer .footer-copy .container .item-list__inline li:last-child, .site-footer .footer-copy .container p:last-child',
            className: 'ie-last-child'
        },
        {
            selector: '.widget__featured-services li:nth-child(odd), .widget-style__2:nth-child(odd)',
            className: 'ie-nth-chd-odd'
        },
        {
            selector: '.widget__featured-services li:nth-child(even), .widget-style__2:nth-child(even)',
            className: 'ie-nth-chd-even'
        },
        {
            selector: '.widget__featured-services li:nth-last-child(2), .widget-style__2:nth-last-child(2)',
            className: 'ie-nth-last-chd-2'
        },
        {
            selector: '.widget__featured-services li:nth-child(1)',
            className: 'ie-nth-chd-1'
        },
        {
            selector: '.home .widget-row:nth-child(2), .widget__featured-services li:nth-child(2)',
            className: 'ie-nth-chd-2'
        },
        {
            selector: '.home .widget-row:nth-child(3), .widget__featured-services li:nth-child(3)',
            className: 'ie-nth-chd-3'
        },
        {
            selector: '.widget__featured-services li:nth-child(4)',
            className: 'ie-nth-chd-4'
        },
        {
            selector: '.widget__featured-services li:nth-child(5)',
            className: 'ie-nth-chd-5'
        },
        {
            selector: '.widget__featured-services li:nth-child(6)',
            className: 'ie-nth-chd-6'
        },
        {
            selector: '.widget__more-services-and-search .more-services-list .category:nth-child(3n+1)',
            className: 'ie-nth-chd-3np1'
        }
    ], 10);

});