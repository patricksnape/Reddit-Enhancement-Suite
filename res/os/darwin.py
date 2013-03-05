# -*- coding: UTF-8

from res.os import OSPathHandler
import os

class DarwinPathHandler(OSPathHandler):

	# TODO: possibly need to get app directly '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome'
	_path_bases   = [os.path.join(os.path.sep, 'Applications')]
	
	_chrome_exes  = ['Google Chrome.app', 'Chromium.app']
	_firefox_exes = ['Firefox.app']
	_safari_exes = ['Safari.app']
	_opera_exes = ['Opera.app']
	
	def __init__(self):
		pass

	def get_chrome_path(self):
		return self._search_paths(self._path_bases, self._chrome_exes)

	def get_firefox_path(self):
		return self._search_paths(self._path_bases, self._firefox_exes)

	def get_safari_path(self):
		return self._search_paths(self._path_bases, self._safari_exes)

	def get_opera_path(self):
		return self._search_paths(self._path_bases, self._opera_exes)