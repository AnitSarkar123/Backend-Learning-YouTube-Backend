import fs from 'fs';

export const CleasUpFilesOnError = (err, req, res, next) => {
    const { avatarLocalfilePath, coverImgLocalPath } = req;
    if (avatarLocalfilePath && fs.existsSync(avatarLocalfilePath)) {
        fs.unlinkSync(avatarLocalfilePath);
    }
    if (coverImgLocalPath && fs.existsSync(coverImgLocalPath)) {
        fs.unlinkSync(coverImgLocalPath);
    }
    next(err);//pass the error to the next middleware or the default file handeler
}

