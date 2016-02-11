// Wrap custom functionality up in a closure to keep scopes tidy
var add_streetlights = (function() {
    var streetlight_layer = null;
    var wfs_url = "https://datatest.angus.gov.uk/geoserver/services/wfs"; // TODO: Switch to production geoserver
    var wfs_feature = "lighting_column_v";
    var streetlight_category = "Street lighting";
    var select_feature_control;
    var selected_feature = null;

    function streetlight_selected(e) {
        // Set the 'column id' extra field to the value of the light that was clicked
        var column_id = e.feature.attributes.n;
        $("#form_column_id").val(column_id);

        var lonlat = e.feature.geometry.getBounds().getCenterLonLat();

        // Hide the normal markers layer to keep things simple, but
        // move the green marker to the point of the click to stop
        // it jumping around unexpectedly if the user deselects street light.
        fixmystreet.markers.setVisibility(false);
        fixmystreet.markers.features[0].move(lonlat);

        // Need to ensure the correct coords are used for the report
        // We can't call fixmystreet_update_pin because that refreshes the category list,
        // clobbering the value we stored in the #form_column_id field.
        lonlat.transform(
            fixmystreet.map.getProjectionObject(),
            new OpenLayers.Projection("EPSG:4326")
        );
        document.getElementById('fixmystreet.latitude').value = lonlat.lat || lonlat.y;
        document.getElementById('fixmystreet.longitude').value = lonlat.lon || lonlat.x;

        // Make sure the marker that was clicked is drawn on top of its neighbours
        var layer = e.feature.layer;
        var feature = e.feature;
        layer.eraseFeatures([feature]);
        layer.drawFeature(feature);

        // Keep track of selection in case layer is reloaded or hidden etc.
        selected_feature = feature.clone();
    }

    function streetlight_unselected(e) {
        fixmystreet.markers.setVisibility(true);
        $("#form_column_id").val("");
        selected_feature = null;
    }

    function find_matching_feature(feature) {
        // When the WFS layer is reloaded the same features might be visible
        // but they'll be different instances of the class so we can't use
        // object identity comparisons.
        // This function will find the best matching feature based on its
        // attributes and distance from the original feature.
        var threshold = 1; // metres
        for (var i = 0; i < streetlight_layer.features.length; i++) {
            var candidate = streetlight_layer.features[i];
            var distance = candidate.geometry.distanceTo(feature.geometry);
            if (candidate.attributes.n == feature.attributes.n && distance <= threshold) {
                return candidate;
            }
        }
    }

    function select_nearest_streetlight() {
        // The user's green marker might be on the map the first time we show the
        // streetlights, so snap it to the closest streetlight marker if so.
        if (!fixmystreet.markers.getVisibility() || !streetlight_layer.getVisibility()) {
            return;
        }
        var threshold = 50; // metres
        var marker = fixmystreet.markers.features[0];
        if (marker === undefined) {
            // No marker to be found so bail out
            return;
        }
        var closest_feature;
        var closest_distance = null
        for (var i = 0; i < streetlight_layer.features.length; i++) {
            var candidate = streetlight_layer.features[i];
            var distance = candidate.geometry.distanceTo(marker.geometry);
            if (closest_distance === null || distance < closest_distance) {
                closest_feature = candidate;
                closest_distance = distance;
            }
        }
        if (closest_distance <= threshold && !!closest_feature) {
            select_feature_control.select(closest_feature);
        }
    }

    function layer_loadend(e) {
        select_nearest_streetlight();
        // Preserve the selected marker when panning/zooming, if it's still on the map
        if (selected_feature !== null && !(selected_feature in this.selectedFeatures)) {
            var replacement_feature = find_matching_feature(selected_feature);
            if (!!replacement_feature) {
                select_feature_control.select(replacement_feature);
            }
        }
    }

    function get_streetlight_stylemap() {
        return new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fillColor: "#0066FF",
                fillOpacity: 0.4,
                strokeColor: "#000000",
                strokeOpacity: 0.75,
                strokeWidth: 1.25,
                pointRadius: 6
            }),
            'select': new OpenLayers.Style({
                fillColor: "#30FF0C",
                fillOpacity: 0.9,
                pointRadius: 14,
                strokeColor: "#000000",
                strokeOpacity: 1,
                strokeWidth: 2.5
            })
        });
    }

    function add_streetlights() {
        if (streetlight_layer !== null) {
            // Layer has already been added
            return;
        }
        if (window.fixmystreet === undefined) {
            // We're on a page without a map, yet somehow still got called...
            // Nothing to do.
            return;
        }
        if (fixmystreet.map === undefined) {
            // Map's not loaded yet, let's try again soon...
            setTimeout(add_streetlights, 250);
            return;
        }
        if (fixmystreet.page != 'new' && fixmystreet.page != 'around') {
            // We only want to show light markers when making a new report
            return;
        }

        var protocol = new OpenLayers.Protocol.WFS({
            version: "1.1.0",
            url:  wfs_url,
            featureType: wfs_feature,
            geometryName: "g"
        });
        var layer = new OpenLayers.Layer.Vector("WFS", {
            strategies: [new OpenLayers.Strategy.BBOX()],
            protocol: protocol,
            visibility: false,
            maxResolution: 2.388657133579254,
            minResolution: 0.5971642833948135,
            styleMap: get_streetlight_stylemap()
        });
        streetlight_layer = layer;
        fixmystreet.streetlight_layer = layer;

        select_feature_control = new OpenLayers.Control.SelectFeature( layer );
        layer.events.register( 'featureselected', layer, streetlight_selected);
        layer.events.register( 'featureunselected', layer, streetlight_unselected);
        layer.events.register( 'loadend', layer, layer_loadend);
        layer.events.register( 'visibilitychanged', layer, select_nearest_streetlight);
        fixmystreet.map.addLayer(layer);
        fixmystreet.map.addControl( select_feature_control );
        select_feature_control.activate();
        fixmystreet.select_feature_control = select_feature_control;

        // Show/hide the streetlight layer when the category is chosen
        $("#problem_form").on("change.category", "select#form_category", function(){
            var category = $(this).val();
            if (category == streetlight_category) {
                layer.setVisibility(true);
            } else {
                layer.setVisibility(false);
            }
        });
    }
    return add_streetlights;
})();

function position_map_box() {
    var $html = $('html');
    if ($html.hasClass('ie6')) {
        $('#map_box').prependTo('body').css({
            zIndex: 0, position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: $(window).height(),
            margin: 0
        });
    } else {
        $('#map_box').prependTo('body').css({
            zIndex: 0, position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: '100%',
            margin: 0
        });
    }
    add_streetlights();
}

function map_fix() {}
var slide_wards_down = 0;
