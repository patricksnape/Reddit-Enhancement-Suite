import json
from shutil import copyfile
import subprocess
import sys
from os import system, environ, getcwd, path, makedirs
import xml.etree.cElementTree as ET

def build_opera_widgets_dat():
    prefs_elem = ET.Element('preferences')

    section_widget_elem = ET.SubElement(prefs_elem, 'section')
    section_widget_elem.set('id', 'widget')

    version = ET.SubElement(section_widget_elem, 'value')
    version.set('xml:space', 'perserve')
    version.text = '1'

    section_res_elem = ET.SubElement(prefs_elem, 'section')
    section_res_elem.set('id', res_id)

    # TODO: How is this path generated?
    ext_path = ET.SubElement(section_res_elem, "value")
    ext_path.set('id', 'path to widget data')
    ext_path.set('xml:space', 'perserve')
    ext_path.text = path.join(getcwd(), 'opera')
    
    download_url = ET.SubElement(section_res_elem, "value")
    download_url.set('id', 'download_URL')
    download_url.set('null', 'yes')

    content_type = ET.SubElement(section_res_elem, "value")
    content_type.set('id', 'content-type')
    content_type.set('xml:space', 'perserve')
    content_type.text = '3'

    class_state = ET.SubElement(section_res_elem, "value")
    class_state.set('id', 'class state')
    class_state.set('xml:space', 'perserve')
    class_state.text = 'enabled'

    tree = ET.ElementTree(prefs_elem)
    # TODO: Don't hard code this
    tree.write(path.join('opera', 'dev-profile', 'widgets', 'widgets.dat'), xml_declaration=True, encoding='utf-8')
    
def build_opera_prefs_dat(res_id):
    prefs_elem = ET.Element('preferences')

    # ui section
    section_ui_elem = ET.SubElement(prefs_elem, 'section')
    section_ui_elem.set('id', 'ui')
    
    name = ET.SubElement(section_ui_elem, 'value')
    name.set('id', 'name')
    name.set('xml:space', 'perserve')
    name.text = 'Reddit Enhancement Suite'
    
    default_prefs_applied = ET.SubElement(section_ui_elem, 'value')
    default_prefs_applied.set('id', 'default_prefs_applied')
    default_prefs_applied.set('xml:space', 'perserve')
    default_prefs_applied.text = '0'

    # res-id section
    section_res_id_elem = ET.SubElement(prefs_elem, 'section')
    section_res_id_elem.set('id', res_id)
    
    network_access = ET.SubElement(section_res_id_elem, 'value')
    network_access.set('id', 'network_access')
    network_access.set('xml:space', 'perserve')
    network_access.text = '24'
    
    # user section
    section_user_elem = ET.SubElement(prefs_elem, 'section')
    section_user_elem.set('id', 'user')
    
    GadgetRunOnSecureConn = ET.SubElement(section_user_elem, 'value')
    GadgetRunOnSecureConn.set('id', 'GadgetRunOnSecureConn')
    GadgetRunOnSecureConn.set('xml:space', 'perserve')
    GadgetRunOnSecureConn.text = 'yes'
    
    GadgetEnabledOnStartup = ET.SubElement(section_user_elem, 'value')
    GadgetEnabledOnStartup.set('id', 'GadgetEnabledOnStartup')
    GadgetEnabledOnStartup.set('xml:space', 'perserve')
    GadgetEnabledOnStartup.text = 'yes'

    tree = ET.ElementTree(prefs_elem)
    # TODO: Don't hard code this
    tree.write(path.join('opera', 'dev-profile', 'widgets', res_id, 'prefs.dat'), xml_declaration=True, encoding='utf-8')

# build chome
manifest = {};
with open('chrome/manifest.json') as manifest_file:
    manifest = json.load(manifest_file)
    
libs = manifest['content_scripts'][0]['js']
for lib in libs:
    if not 'reddit_enhancement_suite.user.js' in lib:
        copyfile(path.join('lib', lib), path.join('chrome', lib))
        
copyfile('reddit_enhancement_suite.user.js', path.join('chrome', 'reddit_enhancement_suite.user.js'))

icons = manifest['icons']

for icon in icons:
    copyfile(path.join('icons', icons[icon]), path.join('chrome', icons[icon]))

if not path.exists(path.join('opera', 'lib')): 
    makedirs(path.join('opera', 'lib'))
if not path.exists(path.join('opera', 'includes')): 
    makedirs(path.join('opera', 'includes'))
    
# build opera
for lib in libs:
    if not 'reddit_enhancement_suite.user.js' in lib:
        copyfile(path.join('lib', lib), path.join('opera', 'lib', lib))
        
copyfile('reddit_enhancement_suite.user.js', path.join('opera', 'includes', 'reddit_enhancement_suite.user.js'))
    
res_id = 'wuid-f40355b5-dab9-7b4e-9861-8c2b6226eb8b'

if not path.exists(path.join('opera', 'dev-profile')): 
    makedirs(path.join('opera', 'dev-profile'))
if not path.exists(path.join('opera', 'dev-profile', 'widgets')): 
    makedirs(path.join('opera', 'dev-profile', 'widgets'))
if not path.exists(path.join('opera', 'dev-profile', 'widgets', res_id)): 
    makedirs(path.join('opera', 'dev-profile', 'widgets', res_id))
    
build_opera_widgets_dat()
build_opera_prefs_dat(res_id)
    
linux_chrome = path.join('usr', 'bin', 'google-chrome')
windows_chrome = path.join(environ['LOCALAPPDATA'], 'Google', 'Chrome', 'Application', 'chrome.exe')
windows_opera = path.join(environ['PROGRAMFILES(X86)'], 'Opera', 'opera.exe')

chrome_ext_folder = path.join(getcwd(), 'chrome')
opera_ext_folder = path.join(getcwd(), 'opera')
opera_dev_folder = path.join(opera_ext_folder, 'dev-profile')

chrome_pack_command = '"%s" --pack-extension="%s" --no-message-box' % (windows_chrome, chrome_ext_folder)
chrome_load_command = '"%s" --load-extension="%s"' % (windows_chrome, chrome_ext_folder)
opera_run_command = '"%s" -pd %s' % (windows_opera, opera_dev_folder)
system(opera_run_command)
