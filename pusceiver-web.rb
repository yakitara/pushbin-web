require 'sinatra'

set :views, "views"
set :public_folder, "public"

locals = {:firebase_url => (ENV['FIREBASE_URL'] || 'https://pusceiver.firebaseio.com/')}

get '/' do
  erb :index, :locals => locals
end

get '/login' do
  erb :login, :locals => locals
end

