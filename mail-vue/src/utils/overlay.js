// Allow popups to shift on both axes when neither side of the trigger has room.
export const viewportPopperOptions = {
    strategy: 'fixed',
    modifiers: [
        { name: 'preventOverflow', options: { altAxis: true, tether: false, padding: 16 } },
        { name: 'flip', options: { padding: 16 } },
    ],
}
