# -*- coding: UTF-8

from res.os import OSPathHandler
import os

class LinuxPathHandler(OSPathHandler):

	# TODO: possibly use which
	_path_bases   = [os.path.join('$HOME', 'Environment', 'local', 'bin'), 
	                 os.path.join('$HOME', 'bin'), 
					 os.path.join(os.path.sep, 'share', 'apps', 'bin'), 
					 os.path.join(os.path.sep, 'usr', 'local', 'bin'), 
					 os.path.join(os.path.sep, 'usr', 'bin')]
	
	_chrome_exes  = ['chromium-browser', 'google-chrome', 'chromium']
	_firefox_exes = ['firefox']
	_opera_exes = ['opera']
	
	def __init__(self):
		pass

	def get_chrome_path(self):
		return self._search_paths(self._path_bases, self._chrome_exes)

	def get_firefox_path(self):
		return self._search_paths(self._path_bases, self._firefox_exes)

	def get_safari_path(self):
		raise Exception("Safari Not Supported On Linux")

	def get_opera_path(self):
		return self._search_paths(self._path_bases, self._opera_exes)