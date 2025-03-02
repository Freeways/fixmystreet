package FixMyStreet::App::Controller::Auth;
use Moose;
use namespace::autoclean;

BEGIN { extends 'Catalyst::Controller'; }

use Email::Valid;
use Net::Domain::TLD;
use mySociety::AuthToken;
use JSON::MaybeXS;
use Net::Facebook::Oauth2;

=head1 NAME

FixMyStreet::App::Controller::Auth - Catalyst Controller

=head1 DESCRIPTION

Controller for all the authentication related pages - create account, sign in,
sign out.

=head1 METHODS

=head2 index

Present the user with a sign in / create account page.

=cut

sub general : Path : Args(0) {
    my ( $self, $c ) = @_;

    $c->detach( 'redirect_on_signin', [ $c->get_param('r') ] )
        if $c->user && $c->get_param('r');

    # all done unless we have a form posted to us
    return unless $c->req->method eq 'POST';

    # decide which action to take
    $c->detach('facebook_sign_in') if $c->get_param('facebook_sign_in');

    my $clicked_password = $c->get_param('sign_in');
    my $clicked_email = $c->get_param('email_sign_in');
    my $data_password = $c->get_param('password_sign_in');
    my $data_email = $c->get_param('name') || $c->get_param('password_register');

    $c->detach('email_sign_in') if $clicked_email || ($data_email && !$data_password);

       $c->forward( 'sign_in' )
    && $c->detach( 'redirect_on_signin', [ $c->get_param('r') ] );

}

sub general_test : Path('_test_') : Args(0) {
    my ( $self, $c ) = @_;
    $c->stash->{template} = 'auth/token.html';
}

=head2 sign_in

Allow the user to sign in with a username and a password.

=cut

sub sign_in : Private {
    my ( $self, $c, $email ) = @_;

    $email ||= $c->get_param('email') || '';
    my $password = $c->get_param('password_sign_in') || '';
    my $remember_me = $c->get_param('remember_me') || 0;

    # Sign out just in case
    $c->logout();

    if (   $email
        && $password
        && $c->authenticate( { email => $email, password => $password } ) )
    {

        # unless user asked to be remembered limit the session to browser
        $c->set_session_cookie_expire(0)
          unless $remember_me;

        return 1;
    }

    $c->stash(
        sign_in_error => 1,
        email => $email,
        remember_me => $remember_me,
    );
    return;
}

=head2 email_sign_in

Email the user the details they need to sign in. Don't check for an account - if
there isn't one we can create it when they come back with a token (which
contains the email addresss).

=cut

sub email_sign_in : Private {
    my ( $self, $c ) = @_;

    # check that the email is valid - otherwise flag an error
    my $raw_email = lc( $c->get_param('email') || '' );

    my $email_checker = Email::Valid->new(
        -mxcheck  => 1,
        -tldcheck => 1,
        -fqdn     => 1,
    );

    my $good_email = $email_checker->address($raw_email);
    if ( !$good_email ) {
        $c->stash->{email} = $raw_email;
        $c->stash->{email_error} =
          $raw_email ? $email_checker->details : 'missing';
        return;
    }

    my $user_params = {};
    $user_params->{password} = $c->get_param('password_register')
        if $c->get_param('password_register');
    my $user = $c->model('DB::User')->new( $user_params );

    my $token_data = {
        email => $good_email,
        r => $c->get_param('r'),
        name => $c->get_param('name'),
        password => $user->password,
    };
    $token_data->{facebook_id} = $c->session->{oauth}{facebook_id}
        if $c->get_param('oauth_need_email') && $c->session->{oauth}{facebook_id};

    my $token_obj = $c->model('DB::Token')->create({
        scope => 'email_sign_in',
        data  => $token_data,
    });

    $c->stash->{token} = $token_obj->token;
    $c->send_email( 'login.txt', { to => $good_email } );
    $c->stash->{template} = 'auth/token.html';
}

=head2 token

Handle the 'email_sign_in' tokens. Find the account for the email address
(creating if needed), authenticate the user and delete the token.

=cut

sub token : Path('/M') : Args(1) {
    my ( $self, $c, $url_token ) = @_;

    # retrieve the token or return
    my $token_obj = $url_token
      ? $c->model('DB::Token')->find( {
          scope => 'email_sign_in', token => $url_token
        } )
      : undef;

    if ( !$token_obj ) {
        $c->stash->{token_not_found} = 1;
        return;
    }

    if ( $token_obj->created < DateTime->now->subtract( days => 1 ) ) {
        $c->stash->{token_not_found} = 1;
        return;
    }

    # Sign out in case we are another user
    $c->logout();

    # find or create the user related to the token.
    my $data = $token_obj->data;
    my $user = $c->model('DB::User')->find_or_create( { email => $data->{email} } );
    $user->name( $data->{name} ) if $data->{name};
    $user->password( $data->{password}, 1 ) if $data->{password};
    $user->facebook_id( $data->{facebook_id} ) if $data->{facebook_id};
    $user->update;
    $c->authenticate( { email => $user->email }, 'no_password' );

    # send the user to their page
    $c->detach( 'redirect_on_signin', [ $data->{r} ] );
}

=head2 facebook_sign_in

Starts the Facebook authentication sequence.

=cut

sub fb : Private {
    my ($self, $c) = @_;
    Net::Facebook::Oauth2->new(
        application_id => $c->config->{FACEBOOK_APP_ID},
        application_secret => $c->config->{FACEBOOK_APP_SECRET},
        callback => $c->uri_for('/auth/Facebook'),
    );
}

sub facebook_sign_in : Private {
    my( $self, $c ) = @_;

    my $fb = $c->forward('/auth/fb');
    my $url = $fb->get_authorization_url(scope => ['email']);

    my %oauth;
    $oauth{return_url} = $c->get_param('r');
    $oauth{detach_to} = $c->stash->{detach_to};
    $oauth{detach_args} = $c->stash->{detach_args};
    $c->session->{oauth} = \%oauth;
    $c->res->redirect($url);
}

=head2 facebook_callback

Handles the Facebook callback request and completes the authentication sequence.

=cut

sub facebook_callback: Path('/auth/Facebook') : Args(0) {
    my( $self, $c ) = @_;

    if ( $c->get_param('error_code') ) {
        $c->stash->{oauth_failure} = 1;
        if ($c->session->{oauth}{detach_to}) {
            $c->detach($c->session->{oauth}{detach_to}, $c->session->{oauth}{detach_args});
        } else {
            $c->stash->{template} = 'auth/general.html';
            $c->detach;
        }
    }

    my $fb = $c->forward('/auth/fb');
    my $access_token;
    eval {
        $access_token = $fb->get_access_token(code => $c->get_param('code'));
    };
    if ($@) {
        ($c->stash->{message} = $@) =~ s/at [^ ]*Auth.pm.*//;
        $c->stash->{template} = 'errors/generic.html';
        $c->detach;
    }

    # save this token in session
    $c->session->{oauth}{token} = $access_token;

    my $info = $fb->get('https://graph.facebook.com/me?fields=name,email')->as_hash();
    my $name = $info->{name};
    my $email = lc ($info->{email} || "");
    my $uid = $info->{id};

    my $user;
    if ($email) {
        # We've got an ID and an email address
        # Remove any existing mention of this ID
        my $existing = $c->model('DB::User')->find( { facebook_id => $uid } );
        $existing->update( { facebook_id => undef } ) if $existing;
        # Get or create a user, give it this Facebook ID
        $user = $c->model('DB::User')->find_or_new( { email => $email } );
        $user->facebook_id($uid);
        $user->name($name);
        $user->in_storage() ? $user->update : $user->insert;
    } else {
        # We've got an ID, but no email
        $user = $c->model('DB::User')->find( { facebook_id => $uid } );
        if ($user) {
            # Matching Facebook ID in our database
            $user->name($name);
            $user->update;
        } else {
            # No matching ID, store ID for use later
            $c->session->{oauth}{facebook_id} = $uid;
            $c->stash->{oauth_need_email} = 1;
        }
    }

    # If we've got here with a full user, log in
    if ($user) {
        $c->authenticate( { email => $user->email }, 'no_password' );
        $c->stash->{login_success} = 1;
    }

    if ($c->session->{oauth}{detach_to}) {
        $c->detach($c->session->{oauth}{detach_to}, $c->session->{oauth}{detach_args});
    } elsif ($c->stash->{oauth_need_email}) {
        $c->stash->{template} = 'auth/general.html';
    } else {
        $c->detach( 'redirect_on_signin', [ $c->session->{oauth}{return_url} ] );
    }
}

=head2 redirect_on_signin

Used after signing in to take the person back to where they were.

=cut


sub redirect_on_signin : Private {
    my ( $self, $c, $redirect ) = @_;
    $redirect = 'my' unless $redirect;
    if ( $c->cobrand->moniker eq 'zurich' ) {
        $redirect = 'my' if $redirect eq 'admin';
        $redirect = 'admin' if $c->user->from_body;
    }
    $c->res->redirect( $c->uri_for( "/$redirect" ) );
}

=head2 redirect

Used when trying to view a page that requires sign in when you're not.

=cut

sub redirect : Private {
    my ( $self, $c ) = @_;

    my $uri = $c->uri_for( '/auth', { r => $c->req->path } );
    $c->res->redirect( $uri );
    $c->detach;

}

=head2 change_password

Let the user change their password.

=cut

sub change_password : Local {
    my ( $self, $c ) = @_;

    $c->detach( 'redirect' ) unless $c->user;

    # FIXME - CSRF check here
    # FIXME - minimum criteria for passwords (length, contain number, etc)

    # If not a post then no submission
    return unless $c->req->method eq 'POST';

    # get the passwords
    my $new = $c->get_param('new_password') // '';
    my $confirm = $c->get_param('confirm') // '';

    # check for errors
    my $password_error =
       !$new && !$confirm ? 'missing'
      : $new ne $confirm ? 'mismatch'
      :                    '';

    if ($password_error) {
        $c->stash->{password_error} = $password_error;
        $c->stash->{new_password}   = $new;
        $c->stash->{confirm}        = $confirm;
        return;
    }

    # we should have a usable password - save it to the user
    $c->user->obj->update( { password => $new } );
    $c->stash->{password_changed} = 1;

}

=head2 sign_out

Log the user out. Tell them we've done so.

=cut

sub sign_out : Local {
    my ( $self, $c ) = @_;
    $c->logout();
}

sub ajax_sign_in : Path('ajax/sign_in') {
    my ( $self, $c ) = @_;

    my $return = {};
    if ( $c->forward( 'sign_in' ) ) {
        $return->{name} = $c->user->name;
    } else {
        $return->{error} = 1;
    }

    my $body = encode_json($return);
    $c->res->content_type('application/json; charset=utf-8');
    $c->res->body($body);

    return 1;
}

sub ajax_sign_out : Path('ajax/sign_out') {
    my ( $self, $c ) = @_;

    $c->logout();

    my $body = encode_json( { signed_out => 1 } );
    $c->res->content_type('application/json; charset=utf-8');
    $c->res->body($body);

    return 1;
}

sub ajax_check_auth : Path('ajax/check_auth') {
    my ( $self, $c ) = @_;

    my $code = 401;
    my $data = { not_authorized => 1 };

    if ( $c->user ) {
        $data = { name => $c->user->name };
        $code = 200;
    }

    my $body = encode_json($data);
    $c->res->content_type('application/json; charset=utf-8');
    $c->res->code($code);
    $c->res->body($body);

    return 1;
}

=head2 check_auth

Utility page - returns a simple message 'OK' and a 200 response if the user is
authenticated and a 'Unauthorized' / 401 reponse if they are not.

Mainly intended for testing but might also be useful for ajax calls.

=cut

sub check_auth : Local {
    my ( $self, $c ) = @_;

    # choose the response
    my ( $body, $code )    #
      = $c->user
      ? ( 'OK', 200 )
      : ( 'Unauthorized', 401 );

    # set the response
    $c->res->body($body);
    $c->res->code($code);

    # NOTE - really a 401 response should also contain a 'WWW-Authenticate'
    # header but we ignore that here. The spec is not keeping up with usage.

    return;
}

__PACKAGE__->meta->make_immutable;

1;
