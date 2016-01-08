package FixMyStreet::SendReport::Angus;

use Moo;

BEGIN { extends 'FixMyStreet::SendReport'; }

use Try::Tiny;
use Encode;
use mySociety::Web qw(ent);

sub construct_message {
    my %h = @_;
    my $message = '';
    $message .= "[ This report was also sent to the district council covering the location of the problem, as the user did not categorise it; please ignore if you're not the correct council to deal with the issue. ]\n\n"
        if $h{multiple};
    $message .= <<EOF;
Subject: $h{title}

Details: $h{detail}

$h{fuzzy}, or to provide an update on the problem, please visit the following link:

$h{url}

$h{closest_address}
EOF
    return $message;
}

sub get_auth_token {
    my ($self, $authresult) = @_;
    if ($authresult =~ m/<AuthenticateResult>\s*([^\s]+)\s*<\/AuthenticateResult>/) {
        return $1;
    } else {
        $self->error("Couldn't authenticate against Angus endpoint.");
    }
}

sub crm_request_type {
    my ($self, $row, $h) = @_;
    return 'StLight'; # TODO: Set this according to report category
}

sub jadu_form_fields {
    my ($self, $row, $h) = @_;
    my $xml = XML::Simple->new(
        NoAttr=> 1,
        KeepRoot => 1,
        SuppressEmpty => 0,
    );
    my $output = $xml->XMLout({
        formfields => {
            formfield => [
                {
                    name => 'RequestTitle',
                    value => 'Test report'
                },
                {
                    name => 'RequestDetails',
                    value => 'This is a request. This field contains details of the request.'
                },
                {
                    name => 'ReporterName',
                    value => 'Test User'
                },
                {
                    name => 'ReporterEmail',
                    value => 'test@example.org'
                },
                {
                    name => 'ReporterAnonymity',
                    value => 'False'
                },
                {
                    name => 'ReportedDateTime',
                    value => '2016-01-08 15:11:00.1234'
                },
                {
                    name => 'ColumnId',
                    value => ''
                },
                {
                    name => 'ReportId',
                    value => '123'
                },
                {
                    name => 'ReportedNorthing',
                    value => '750781'
                },
                {
                    name => 'ReportedEasting',
                    value => '345986'
                },
                {
                    name => 'Imageurl1',
                    value => ''
                },
                {
                    name => 'Imageurl2',
                    value => ''
                },
                {
                    name => 'Imageurl3',
                    value => ''
                }
            ]
        }
    });
    # The endpoint crashes if the JADUFormFields string has whitespace between XML elements, so strip it out...
    $output =~ s/>[\s\n]+</></g;
    print $output;
    return $output;
}

sub send {
    my ( $self, $row, $h ) = @_;

    # FIXME: should not recreate this each time
    my $angus_service;

    require AngusSOAP;

    $h->{category} = 'Customer Services' if $h->{category} eq 'Other';
    $h->{message} = construct_message( %$h );
    my $return = 1;
    $angus_service ||= AngusSOAP->on_fault(sub { my($soap, $res) = @_; die ref $res ? $res->faultstring : $soap->transport->status, "\n"; });
    try {
        my $authresult = $angus_service->AuthenticateJADU();
        my $authtoken = $self->get_auth_token( $authresult );
        # authenticationtoken, CallerId, CallerAddressId, DeliveryId, DeliveryAddressId, CRMRequestType, JADUXFormRef, PaymentRef, JADUFormFields
        my $message = ent(encode_utf8($h->{message}));
        my $name = ent(encode_utf8($h->{name}));
        my $result = $angus_service->CreateServiceRequest(
            $authtoken, '1', '1', '1', '1', $self->crm_request_type($row, $h),
            'FMS', '', $self->jadu_form_fields($row, $h)
            # $h->{category}, 'FixMyStreet', '', '', $name, $h->{email}, $h->{phone},
            # '', '', '', '', '', '', $message, 'Yes', $h->{image_url}
        );
        print $result;
        $return = 0 if $result eq 'Report received';
    } catch {
        my $e = $_;
        print "Caught an error: $e\n";
        $self->error( "Error sending to Angus: $e" );
    };
    $self->success( !$return );
    return $return;
}

1;
