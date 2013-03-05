# -*- coding: UTF-8

from res.os import OSPathHandler
import os

class WindowsPathHandler(OSPathHandler):

	_path_bases   = ['${ProgramFiles(x86)}', 
	                 '${ProgramFiles}']
	_chrome_extra_base_paths = ['${LOCALAPPDATA}', 
	                            '${APPDATA}']
	_chrome_exes  = [os.path.join('Google', 'Chrome', 'Application', 'chrome.exe'), 
	                 os.path.join('Chromium', 'Application', 'chrome.exe')]
	_firefox_exes = [os.path.join('Mozilla Firefox', 'firefox.exe')]
	_safari_exes  = [os.path.join('Safari', 'safari.exe')]
	_opera_exes   = [os.path.join('Opera', 'opera.exe')]
	
	def __init__(self):
		pass

	def get_chrome_path(self):
		return self._search_paths(self._chrome_extra_base_paths + self._path_bases, self._chrome_exes)

	def get_firefox_path(self):
		return self._search_paths(self._path_bases, self._firefox_exes)

	def get_safari_path(self):
		return self._search_paths(self._path_bases, self._safari_exes)

	def get_opera_path(self):
		return self._search_paths(self._path_bases, self._opera_exes)