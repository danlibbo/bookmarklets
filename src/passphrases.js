(function () {
  const descriptors = ['Alert','Always','Badly','Brave','Bright','Brightly','Calm','Calmly','Clear','Clearly','Close','Closely','Cold','Common','Cool','Daily','Deeply','Direct','Early','Easily','Empty','Even','Evenly','Exact','Exactly','Extra','Fair','Fairly','Final','Finally','Fine','Finely','First','Fit','Fixed','Freely','Fresh','Freshly','Full','Fully','Gently','Glad','Gladly','Gold','Golden','Grand','Great','Greatly','Green','Happy','Happily','Heavy','Highly','Honestly','Hourly','Human','Ideal','Inner','Joint','Keen','Kind','Kindly','Large','Largely','Last','Late','Lately','Legal','Level','Light','Lightly','Local','Loud','Loudly','Low','Lower','Lucky','Magic','Main','Mainly','Major','Merely','Monthly','Moral','Motor','Neat','Neatly','Nearly','Newer','Newly','Next','Noble','Normal','Official','Often','Only','Open','Openly','Other','Outer','Past','Personal','Plain','Plainly','Prime','Proud','Proudly','Public','Quick','Quickly','Quiet','Quietly','Radio','Rapid','Rarely','Real','Really','Rich','Right','Rising','Roman','Royal','Rural','Sadly','Safe','Safely','Same','Sharp','Shiny','Short','Simple','Simply','Single','Slow','Slowly','Small','Smart','Smooth','Soft','Solid','Special','Square','Still','Stone','Strong','Sure','Sweet','Tall','Tidy','Total','True','Upper'];
  const verbs = ['Acted','Acting','Added','Adding','Answered','Answering','Applied','Arrived','Arriving','Asked','Asking','Avoided','Avoiding','Become','Becoming','Begun','Beginning','Believed','Believing','Bought','Brought','Buying','Building','Built','Called','Calling','Cared','Caring','Catching','Caught','Changed','Changing','Checked','Checking','Choosing','Chosen','Cleaned','Cleaning','Cleared','Clearing','Climbed','Climbing','Closed','Closing','Counted','Counting','Covered','Covering','Crossed','Crossing','Danced','Dancing','Dated','Dating','Dealing','Dealt','Decided','Deciding','Drawn','Dreamed','Dreaming','Driven','Driving','Ended','Ending','Entered','Entering','Faced','Facing','Fallen','Falling','Filled','Filling','Finding','Found','Flown','Flying','Followed','Following','Gained','Gaining','Given','Giving','Going','Gone','Grown','Growing','Guided','Guiding','Handled','Handling','Heard','Hearing','Held','Helping','Hidden','Hiding','Holding','Hoped','Hoping','Imagined','Imaging','Invited','Inviting','Joked','Joined','Joining','Judged','Judging','Jumped','Jumping','Kept','Keeping','Knowing','Known','Laughed','Laughing','Learned','Learning','Leaving','Left','Lifted','Lifting','Lived','Living','Looked','Looking','Losing','Lost','Made','Making','Marked','Marking','Matched','Matching','Meeting','Met','Moved','Moving','Opened','Opening','Ordered','Ordering','Paid','Painted','Painting','Parked','Parking','Paying','Picked','Picking','Planned','Planning','Played','Playing','Pressed','Pressing','Pulled','Pulling','Pushed','Pushing','Raised','Raising','Reached','Reaching','Read','Reading','Run','Running','Seen','Seeing','Set','Setting','Started','Starting','Taken','Taking','Talked','Talking'];
  const nouns = ['Area','Art','Back','Bunk','Bed','Bill','Book','Business','Car','Case','Cash','Cat','Centre','Change','City','Class','Club','Cost','Day','Door','End','Fact','Family','Farm','Father','Field','File','Film','Food','Foot','Force','Form','Fund','Game','Hand','Health','Heart','Home','Hour','House','Idea','Issue','Job','Judge','Kind','King','Lake','Land','Law','Level','Life','Light','Line','Link','List','Mail','Map','Mark','Market','Matter','Media','Mind','Minute','Model','Money','Month','Morning','Mother','Music','Name','Need','Network','News','Night','Note','Number','Office','Order','Owner','Page','Paint','Paper','Parent','Park','Part','Past','Path','Peace','People','Person','Phone','Photo','Place','Plan','Plane','Plant','Play','Point','Post','Price'];
  const punctuation = ['!', '#', '$', '%', '&', '*', '+', '-', '.'];
  function pick(items) { return items[Math.floor(Math.random() * items.length)]; }
  function randomCase(word) { return Math.random() > 0.5 ? word.charAt(0).toLowerCase() + word.slice(1) : word; }
  const descriptor = randomCase(pick(descriptors));
  const firstSeparator = pick(punctuation);
  const verb = randomCase(pick(verbs));
  const secondSeparator = pick(punctuation);
  const noun = pick(nouns);
  const casedNoun = descriptor[0] === descriptor[0].toLowerCase() && verb[0] === verb[0].toLowerCase() ? noun : randomCase(noun);
  const number = Math.floor(Math.random() * 90) + 10;
  const passphrase = descriptor + firstSeparator + verb + secondSeparator + casedNoun + number;
  const textarea = document.createElement('textarea');
  try {
    textarea.value = passphrase;
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    if (!document.execCommand('copy')) throw new Error('Clipboard access refused');
  } catch (error) {
    prompt('Copy this passphrase:', passphrase);
    return;
  } finally {
    textarea.remove();
  }
  const toast = document.createElement('div');
  const message = document.createElement('span');
  message.textContent = 'copied to clipboard!';
  message.style.fontSize = '0.875rem';
  message.style.fontWeight = '400';
  toast.append(document.createTextNode(passphrase), document.createElement('br'), message);
  toast.setAttribute('role', 'status');
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-50px);background-color:#22c55e;color:white;padding:12px 24px;border-radius:8px;font-family:sans-serif;font-weight:600;z-index:2147483647;opacity:0;transition:all 0.3s ease-in-out;text-align:center;';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(-50px)'; }, 5000);
  setTimeout(() => toast.remove(), 5300);
})();
