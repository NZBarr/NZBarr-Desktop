
I need a uplaod system for nzbfiles for;
1. Movies
2. TV
3. Music
4. Books
5. Magazines
6. XXX

===== MOVIES.

It should automatically search for movies based on the filename.
But Movies always are in this pattern:

" Krazy House (2024) [720p-AMZN-WEB-DL-DDP5-264-FLUX-mkv-imdb] (imdb-tt12276028).nzb "

From this filename, the system should extract the movie title, year, and IMDB ID. Everything between [ and ] are considered tags.
Those tags should be populated the the appropriate fileds in the database.

Based on resolution, the release should be placed in the correct category.
Like 1080p/720p should go in Movies HD category, 4K/2160p shoudl be placed in Movies UHD category, anything lower then 720p or SD should be placed in category Movies SD.  For all that can not be placed in such, they shoudl be placed in category Other. (if categories do not exsit, create them in the database)

Also the uploaded nzb files, shoudl be analyzed. Like looking for a password in the xml structure of the nzb files, also get the postdate, articles, size etc. from teh nzb file.  All these data shoudl be placed in teh database in the correct fields.  If fields do not exist, create them.

Then, in background, the nzb files should also be analyzed, and pieces will be downloaded and extracted to run media info on them.
The media info data should also be placed in the database.
Please check nzbarr2.0 web based, to see how it works there. There it happens on upload too, and mediainfo is ran etc. etc.  But also through commandline on bacth import. For that see the folder.nzbarr2.0/bin/.  There are scripts there.  Also scripts that rename nzbfiles to the correct pattern for nzb filenames. Also scripts that add the imdbID to the filenames. They can help you too.

Also we need an option to maually add a movie if it can not be fetched.
Also on the movie detail pages, we need an edit button, so we can edit the movie completely with all its fields

==== TV.

It should automatically search for TV shows based on the filename.
But TV shows always are in this pattern:

" Blue Bloods [SxxExx] (2010) [1080p-WEB-DL-x264-DD2-CZ-MFUSENET-mkv] (tmdb-32692).nzb "
" Blue Bloods [Sxx] (2010) [1080p-WEB-DL-x264-DD2-CZ-MFUSENET-mkv] (tmdb-32692).nzb "
" Blue Bloods [S99] (2010) [1080p-WEB-DL-x264-DD2-CZ-MFUSENET-mkv] (tmdb-32692).nzb "

From this filename, the system should extract the show title, season, episode number, year, and TMDB ID. Everything between [ and ] are considered tags.
Those tags should be populated the the appropriate fileds in the database.

NOTE:   When a filename has SxxExx, then Sxx is season number and Exx is episode number.
        When a filename has only Sxx. That means that it is a complete season
        When a filename has explicitely S99 It is a complete series.
        When a filename has S00 It is a special

Like 1080p/720p should go in TV HD category, 4K/2160p shoudl be placed in TV UHD category, anything lower then 720p or SD should be placed in category TV SD.  For all that can not be placed in such, they should be placed in category Other. (if categories do not exsit, create them in the database)

Also the uploaded nzb files, shoudl be analyzed. Like looking for a password in the xml structure of the nzb files, also get the postdate, articles, size etc. from teh nzb file.  All these data shoudl be placed in teh database in the correct fields.  If fields do not exist, create them.

Then, in background, the nzb files should also be analyzed, and pieces will be downloaded and extracted to run media info on them.
The media info data should also be placed in the database.
Please check nzbarr2.0 web based, to see how it works there. There it happens on upload too, and mediainfo is ran etc. etc.  But also through commandline on bacth import. For that see the folder.nzbarr2.0/bin/.  There are scripts there.  Also scripts that rename nzbfiles to the correct pattern for nzb filenames. Also scripts that add the tmdbID to the filenames. They can help you too.Like 1080p/720p should go in TV HD category, 4K/2160p shoudl be placed in TV UHD category, anything lower then 720p or SD should be placed in category TV SD.  For all that can not be placed in such, they shoudl be placed in category Other. (if categories do not exsit, create them in the database)

Also we need an option to maually add a tvshow if it can not be fetched.
Also on the tvshow detail pages, we need an edit button, so we can edit the theshow completely with all its fields


=== Music.

For music uploads, we dont have a system yet, maybe you have ideas...  but if not, we need a lookuptool to find the correct album, and then metadata shoudl be fetched, like playlist, artist ID's, etc.  Also for music, we not only neec cover, but also cutout, logos etc. etc. as much as possible, to make the detail page look great. Maybe even a little text about the artist etc. etc.
Als need an option to maually add a album if it can not be fetched.



For all releases, we need to be able to edit them and change fields if we like. And if wrongly connected to a tvshow or movie we can corerct that, also correct wrogly categories etc.

Please look at the detail pages in nzbarr2.0 Webbased.  You will see there what i mean.  The detail pages are in the templates folder, named;  detail_movies.twig, detail_tv.twig, detail_music.twig, detail_releases.twig etc. etc.

I hope you understand what i mean...  but please, have a thorough view/read at the nzbarr2.0 web...  there it all works fine.
If we all got this working, we can fine tune thinsg with settins etc.,  user restrictions, licensing system.   

IMPORTANT:  The goal is to eventually distribute this as an app. So it shoudl be as simple as possible for user to install teh app on their system. Whether it is a Windows system or a macos system, it shoudl work as an app everywhere.
But we do not plan it to dustribute it trhough stores liek apple store. We distribute it through our won website.


So you think you can do this? Please let me know.


Please let me know what settings you need to give you YOLO?