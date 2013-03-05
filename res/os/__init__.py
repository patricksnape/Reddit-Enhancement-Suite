# -*- coding: UTF-8

from abc import ABCMeta, abstractmethod
import sys
import os

class OSPathHandler(object):
	__metaclass__ = ABCMeta

	@abstractmethod
	def get_chrome_path(self):
		pass

	@abstractmethod
	def get_firefox_path(self):
		pass

	@abstractmethod
	def get_safari_path(self):
		pass

	@abstractmethod
	def get_opera_path(self):
		pass
		
	def _search_paths(self, path_bases, exes):
		for base in path_bases:
			for exe in exes:
				path = os.path.expandvars(os.path.join(base, exe))
				if os.path.exists(path):
					return path
		# Fall through
		return None
	
def get_path_handler():
	if sys.platform.startswith('win'):
		from res.os.windows import WindowsPathHandler
		return WindowsPathHandler()
	if sys.platform.startswith('darwin'):
		from res.os.darwin import DarwinPathHandler
		return DarwinPathHandler()
	if sys.platform.startswith('linux'):
		from res.os.linux import LinuxPathHandler
		return LinuxPathHandler()