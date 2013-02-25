require 'sinatra'

#set :public_folder, "."

get '/login' do
  erb :login, :locals => {:firebase_url => (ENV['FIREBASE_URL'] || 'https://pusceiver.firebaseio.com/')}
end
