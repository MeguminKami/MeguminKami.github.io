export function canModify(activity, user) {
  return Boolean(activity && user && (activity.type === "casal" || activity.creator === user));
}

export function canComment(activity, user) {
  return Boolean(activity && user && user !== activity.creator && !activity.comment);
}

export function canEditComment(activity, user) {
  return Boolean(activity?.comment && activity.comment.author === user);
}
