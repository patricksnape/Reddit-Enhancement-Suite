import json
from shutil import copyfile
import subprocess
import sys
from os import system

manifest = {};
with open('chrome/manifest.json') as manifest_file:
    manifest = json.load(manifest_file)
    
libs = manifest['content_scripts'][0]['js']
for lib in libs:
    if not 'reddit_enhancement_suite.user.js' in lib:
        src = 'lib/%s' % (lib)
        dest = 'chrome/%s' % (lib)
        copyfile(src, dest)
        
copyfile('reddit_enhancement_suite.user.js', 'chrome/reddit_enhancement_suite.user.js')

icons = manifest['icons']

for icon in icons:
    src = 'icons/%s' % (icons[icon])
    dest = 'chrome/%s' % (icons[icon])
    copyfile(src, dest)
    
cmd = '%s --pack-extension=%s --no-message-box' % ('/usr/bin/google-chrome', 'chrome')
print cmd.encode(sys.getfilesystemencoding())
system(cmd.encode(sys.getfilesystemencoding()))
