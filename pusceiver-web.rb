# require 'sinatra'
# require 'omniauth-twitter'
require 'addressable/uri'

set :views, "views"
set :public_folder, "public"

locals = {:firebase_url => (ENV['FIREBASE_URL'] || 'https://pusceiver.firebaseio.com/')}

get %r{^/(rooms/.*)?$} do
  response.set_cookie('firebaseUserToken', session['firebaseUserToken'])
  erb :index, :locals => locals
end

# get '/login' do
#   erb :login, :locals => locals
# end

# auth
enable :sessions
set :session_secret, ENV['SESSION_SECRET']
#require "sinatra/cookies"

use OmniAuth::Builder do
  provider :twitter, ENV['TWITTER_CONSUMER_KEY'], ENV['TWITTER_CONSUMER_SECRET']
end

%w(get post).each do |method|
  send(method, "/auth/:provider/callback") do |provider|
    auth_hash = env['omniauth.auth'] # => OmniAuth::AuthHash
    generator = Firebase::FirebaseTokenGenerator.new(ENV['FIREBASE_APP_SECRET'])
    payload = {
      :provider => auth_hash['provider'],
      :id => auth_hash['uid'],
      :nickname => auth_hash['info']['nickname']
    }
    token = generator.create_token(payload)
    if callback = env['omniauth.params']['callback']
      uri = Addressable::URI.parse(callback)
      uri.query_values = (uri.query_values || {}).merge(:auth_token => token)
      redirect to(uri.to_s)
    else
      session['firebaseUserToken'] = token
      redirect to(env['omniauth.origin'] || '/')
    end
  end
end
