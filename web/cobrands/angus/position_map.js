// Wrap custom functionality up in a closure to keep scopes tidy
var add_streetlights = (function() {
    var streetlight_layer = null;
    var wfs_url = "https://datatest.angus.gov.uk/geoserver/services/wfs"; // TODO: Switch to production geoserver
    var wfs_feature = "lighting_column_v";
    var streetlight_category = "Street lighting";

    function street_light_selected(e) {
            var column_id = e.feature.attributes.n;
            $("#form_column_id").val(column_id);
            var lonlat = e.feature.geometry.getBounds().getCenterLonLat();
            // We should already have a problem location pin to move into place
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
            minResolution: 0.5971642833948135
        });
        streetlight_layer = layer;

        var select_feature = new OpenLayers.Control.SelectFeature( layer );
        layer.events.register( 'featureselected', layer, street_light_selected);
        fixmystreet.map.addLayer(layer);
        fixmystreet.map.addControl( select_feature );
        select_feature.activate();

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
