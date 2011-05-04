use strict;
use warnings;
use Test::More;


use Catalyst::Test 'FixMyStreet::App';
use Test::WWW::Mechanize::Catalyst 'FixMyStreet::App';

ok( my $mech = Test::WWW::Mechanize::Catalyst->new, 'Created mech object' );

# check that we can get the page
$mech->get_ok('/alert');
$mech->content_contains('Local RSS feeds and email alerts');
$mech->content_contains('html lang="en-gb"');

done_testing();
