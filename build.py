import json
from shutil import copyfile
import subprocess
import sys
from os import system, environ, getcwd

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
    
linux = '/usr/bin/google-chrome'
windows = '%s\Google\Chrome\Application\chrome.exe' % (environ['LOCALAPPDATA'])
chrome_folder = '"%s/chrome"' % (getcwd())
chrome_folder = chrome_folder.encode(sys.getfilesystemencoding())
pack_command = '%s --pack-extension=%s --no-message-box' % (windows, chrome_folder)
load_command = '%s --load-extension=%s' % (windows, chrome_folder)
system(pack_command.encode(sys.getfilesystemencoding()))
