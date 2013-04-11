# CHROME
#Make dirs if they don't exist (first checkout)
mkdir -p Chrome/modules
mkdir -p Chrome/libs
# Cleanup dead links
rm -f Chrome/libs/*.js
rm -f Chrome/modules/*.js
rm -f Chrome/reddit_enhancement_suite.user.js
# Create new links
ln lib/*.js Chrome/libs/
ln modules/*.js Chrome/modules/
ln reddit_enhancement_suite.user.js Chrome/

