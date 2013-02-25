# -*- ruby -*-
require './pusceiver-web'
run Sinatra::Application

#use Rack::Static, :urls => ["/"], :root => "public"
#run lambda {}

# run lambda { |env|
#   [
#     200, 
#     {
#       'Content-Type'  => 'text/html', 
#       'Cache-Control' => 'public, max-age=86400' 
#     },
#     ["It works!"]
#   ]
# }
