function checkUserIdMatches(req, res, next) {
  const requestedId = Number(req.params.id)
  
  // Добавили проверку на NaN
  if (isNaN(requestedId)) {
    return res.status(400).json({ message: 'Неверный ID пользователя' })
  }

  if (requestedId !== req.userId) {
    console.warn(`IDOR attempt: user ${req.userId} tried to access ${requestedId}`)
    return res.status(403).json({ 
      message: 'Доступ запрещён',
      code: 'ACCESS_DENIED'
    })
  }
  
  next()
}

module.exports = checkUserIdMatches