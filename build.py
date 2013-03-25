import json
from shutil import copyfile
import subprocess
import sys
import struct
import hashlib
import zipfile
import StringIO
from Crypto.PublicKey import RSA
from pyasn1.codec.der import encoder
from pyasn1.type import univ
import ctypes
import os
import xml.etree.cElementTree as ET

def zip_path_to_string(path):
    zip_buffer = StringIO.StringIO()
    zip_file = zipfile.ZipFile(zip_buffer, 'w')
    for root, dirs, files in os.walk(path):
      for file in files:  
        abspath = os.path.realpath(os.path.join(root, file))
        relpath = abspath.replace(path + os.path.sep, "")
        zip_file.write(abspath, relpath)
    zip_file.close()
    zip_string = zip_buffer.getvalue()
    return zip_string
	
def toBitString(num):
    """ Converts a long into the bit string. """
    buf = ''
    while num > 1:
      buf = str(num & 1) + buf
      num = num >> 1
    buf = str(num) + buf
    return buf
	
def get_X509_publickey(rsakey):
    """ Gets an ASN.1-encoded form of this RSA key's public key. """
    # Get a RSAPublicKey structure
    pkinfo = univ.Sequence()
    pkinfo.setComponentByPosition(0, univ.Integer(rsakey.n))
    pkinfo.setComponentByPosition(1, univ.Integer(rsakey.e))
    
    # Encode the public key info as a bit string
    pklong = long(encoder.encode(pkinfo).encode('hex'), 16)
    pkbitstring = univ.BitString("'00%s'B" % toBitString(pklong))

    # Get the rsaEncryption identifier:
    idrsaencryption = univ.ObjectIdentifier('1.2.840.113549.1.1.1')

    # Get the AlgorithmIdentifier for rsaEncryption
    idinfo = univ.Sequence()
    idinfo.setComponentByPosition(0, idrsaencryption)
    idinfo.setComponentByPosition(1, univ.Null(''))

    # Get the SubjectPublicKeyInfo structure
    publickeyinfo = univ.Sequence()
    publickeyinfo.setComponentByPosition(0, idinfo)
    publickeyinfo.setComponentByPosition(1, pkbitstring)

    # Encode the public key structure
    publickey = encoder.encode(publickeyinfo)
    return publickey

def pack_chrome_extension_manual(ext_path):
	#   Little Endian
	#	magic number	    char[]	        32 bits	         Cr24	            Chrome requires this constant at the beginning of every .crx package.
	#	version	            unsigned int	32 bits	         2	                The version of the *.crx file format used (currently 2).
	#	public key length	unsigned int	32 bits	         pubkey.length	    The length of the RSA public key in bytes.
	#	signature length	unsigned int	32 bits	         sig.length	        The length of the signature in bytes.
	#	public key	        byte[]	        pubkey.length	 pubkey.contents	The contents of the author's RSA public key, formatted as an X509 SubjectPublicKeyInfo block.
	#	signature	        byte[]	        sig.length	     sig.contents
	zip_string = zip_path_to_string(ext_path)
	zip_hash = hashlib.sha1(zip_string).digest()

    # Get the SHA1 AlgorithmIdentifier
	sha1identifier = univ.ObjectIdentifier('1.3.14.3.2.26')
	sha1info = univ.Sequence()
	sha1info.setComponentByPosition(0, sha1identifier)
	sha1info.setComponentByPosition(1, univ.Null(''))

	# Get the DigestInfo sequence, composed of the SHA1 id and the zip hash
	digestinfo = univ.Sequence()
	digestinfo.setComponentByPosition(0, sha1info)
	digestinfo.setComponentByPosition(1, univ.OctetString(zip_hash))

    # Encode the sequence into ASN.1
	digest = encoder.encode(digestinfo)
    
    # Pad the hash
	paddinglength = 128 - 3 - len(digest)
	paddedhexstr = "0001%s00%s" % (paddinglength * 'ff', digest.encode('hex'))
    
	# Calculate the signature
	rsa_key = RSA.generate(1024, os.urandom)
	signature_bytes = rsa_key.sign(paddedhexstr.decode('hex'), "")[0]
	signature = ('%X' % signature_bytes).decode('hex')
    
	# Get the public key
	publickey = get_X509_publickey(rsa_key)
    
	# Write the actual CRX contents
	crx_buffer = StringIO.StringIO("wb")
	crx_buffer.write("Cr24")  # Extension file magic number, from the CRX focs
	crx_buffer.write(struct.pack('<iii', 2, len(publickey), len(signature)))
	crx_buffer.write(publickey)
	crx_buffer.write(signature)
	crx_buffer.write(zip_string)
	crx_file = crx_buffer.getvalue()
    
	with open('res.crx', 'wb') as f:
		f.write(crx_file)
		
	with open('dev.pem', 'wb') as f:
		f.write(rsa_key.publickey().exportKey())

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
    ext_path.text = os.path.join(os.getcwd(), 'opera')
    
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
    tree.write(os.path.join('opera', 'dev-profile', 'widgets', 'widgets.dat'), xml_declaration=True, encoding='utf-8')
    
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
    tree.write(os.path.join('opera', 'dev-profile', 'widgets', res_id, 'prefs.dat'), xml_declaration=True, encoding='utf-8')

# build chome
manifest = {};
with open('chrome/manifest.json') as manifest_file:
    manifest = json.load(manifest_file)
    
libs = manifest['content_scripts'][0]['js']
for lib in libs:
    if not 'reddit_enhancement_suite.user.js' in lib:
        copyfile(os.path.join('lib', lib), os.path.join('chrome', lib))
        
copyfile('reddit_enhancement_suite.user.js', os.path.join('chrome', 'reddit_enhancement_suite.user.js'))

icons = manifest['icons']

for icon in icons:
    copyfile(os.path.join('icons', icons[icon]), os.path.join('chrome', icons[icon]))

if not os.path.exists(os.path.join('opera', 'lib')): 
    os.makedirs(os.path.join('opera', 'lib'))
if not os.path.exists(os.path.join('opera', 'includes')): 
    os.makedirs(os.path.join('opera', 'includes'))
    
# build opera
for lib in libs:
    if not 'reddit_enhancement_suite.user.js' in lib:
        copyfile(os.path.join('lib', lib), os.path.join('opera', 'lib', lib))
        
copyfile('reddit_enhancement_suite.user.js', os.path.join('opera', 'includes', 'reddit_enhancement_suite.user.js'))
    
res_id = 'wuid-f40355b5-dab9-7b4e-9861-8c2b6226eb8b'

if not os.path.exists(os.path.join('opera', 'dev-profile')): 
    os.makedirs(os.path.join('opera', 'dev-profile'))
if not os.path.exists(os.path.join('opera', 'dev-profile', 'widgets')): 
    os.makedirs(os.path.join('opera', 'dev-profile', 'widgets'))
if not os.path.exists(os.path.join('opera', 'dev-profile', 'widgets', res_id)): 
    os.makedirs(os.path.join('opera', 'dev-profile', 'widgets', res_id))
    
build_opera_widgets_dat()
build_opera_prefs_dat(res_id)
    
linux_chrome = os.path.join('usr', 'bin', 'google-chrome')
windows_chrome = os.path.join(os.environ['LOCALAPPDATA'], 'Google', 'Chrome', 'Application', 'chrome.exe')
windows_opera = os.path.join(os.environ['PROGRAMFILES(X86)'], 'Opera', 'opera.exe')

chrome_ext_folder = os.path.join(os.getcwd(), 'chrome')
opera_ext_folder = os.path.join(os.getcwd(), 'opera')
opera_dev_folder = os.path.join(opera_ext_folder, 'dev-profile')

chrome_pack_command = '"%s" --pack-extension="%s" --no-message-box' % (windows_chrome, chrome_ext_folder)
chrome_load_command = '"%s" --load-extension="%s"' % (windows_chrome, chrome_ext_folder)
opera_run_command = '"%s" -pd %s' % (windows_opera, opera_dev_folder)
#os.system(opera_run_command)
pack_chrome_extension_manual(chrome_ext_folder)